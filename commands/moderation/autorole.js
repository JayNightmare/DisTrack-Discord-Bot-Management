const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");
const GuildConfig = require("../../models/GuildConfig");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autorole")
        .setDescription("Configure automatic role assignment for new members")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set the auto-role for new members")
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Role to assign to new members")
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName("bot-role")
                        .setDescription("Role to assign to new bots (optional)")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("enable")
                .setDescription("Enable auto-role assignment")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("disable")
                .setDescription("Disable auto-role assignment")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("status")
                .setDescription("Show current auto-role configuration")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("test")
                .setDescription("Test auto-role assignment on yourself")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "set":
                    await this.handleSet(interaction);
                    break;
                case "enable":
                    await this.handleEnable(interaction);
                    break;
                case "disable":
                    await this.handleDisable(interaction);
                    break;
                case "status":
                    await this.handleStatus(interaction);
                    break;
                case "test":
                    await this.handleTest(interaction);
                    break;
                default:
                    await interaction.reply({
                        embeds: [Utils.createErrorEmbed("Unknown subcommand.")],
                        ephemeral: true,
                    });
            }
        } catch (error) {
            Utils.log(`Error in autorole command: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "An error occurred while processing the auto-role command."
                    ),
                ],
                ephemeral: true,
            });
        }
    },

    async handleSet(interaction) {
        const role = interaction.options.getRole("role");
        const botRole = interaction.options.getRole("bot-role");

        // Validate the role can be assigned by the bot
        if (
            role.position >= interaction.guild.members.me.roles.highest.position
        ) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "I cannot assign this role because it is higher than or equal to my highest role."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed (like bot roles, Nitro booster, etc.)
        if (role.managed) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "This role is managed by Discord/integrations and cannot be assigned automatically."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        // Validate bot role if provided
        if (botRole) {
            if (
                botRole.position >=
                interaction.guild.members.me.roles.highest.position
            ) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "I cannot assign the bot role because it is higher than or equal to my highest role."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            if (botRole.managed) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "The bot role is managed by Discord/integrations and cannot be assigned automatically."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }
        }

        // Get or create guild config
        let guildConfig = await GuildConfig.findOne({
            guildId: interaction.guild.id,
        });
        if (!guildConfig) {
            guildConfig = new GuildConfig({ guildId: interaction.guild.id });
        }

        // Update auto-role configuration
        guildConfig.autoRoleConfig.roleId = role.id;
        guildConfig.autoRoleConfig.botRoleId = botRole?.id || null;
        guildConfig.autoRoleConfig.enabled = true; // Auto-enable when setting role

        await guildConfig.save();

        const successEmbed = Utils.createSuccessEmbed(
            `**Member Role:** ${role}\n${
                botRole ? `**Bot Role:** ${botRole}\n` : ""
            }Auto-role has been enabled automatically.`,
            `${config.emojis.success} Auto-Role Configuration Updated`
        );

        await interaction.reply({ embeds: [successEmbed] });

        Utils.log(
            `${Utils.formatUser(interaction.user)} set auto-role to ${
                role.name
            } in ${interaction.guild.name}`
        );
    },

    async handleEnable(interaction) {
        const guildConfig = await GuildConfig.findOne({
            guildId: interaction.guild.id,
        });

        if (!guildConfig || !guildConfig.autoRoleConfig.roleId) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "No auto-role has been configured. Use `/autorole set` first."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        if (guildConfig.autoRoleConfig.enabled) {
            await interaction.reply({
                embeds: [
                    Utils.createWarningEmbed("Auto-role is already enabled."),
                ],
                ephemeral: true,
            });
            return;
        }

        guildConfig.autoRoleConfig.enabled = true;
        await guildConfig.save();

        const successEmbed = Utils.createSuccessEmbed(
            "Auto-role assignment has been enabled.",
            `${config.emojis.success} Auto-Role Enabled`
        );

        await interaction.reply({ embeds: [successEmbed] });

        Utils.log(
            `${Utils.formatUser(interaction.user)} enabled auto-role in ${
                interaction.guild.name
            }`
        );
    },

    async handleDisable(interaction) {
        const guildConfig = await GuildConfig.findOne({
            guildId: interaction.guild.id,
        });

        if (!guildConfig || !guildConfig.autoRoleConfig.enabled) {
            await interaction.reply({
                embeds: [
                    Utils.createWarningEmbed("Auto-role is already disabled."),
                ],
                ephemeral: true,
            });
            return;
        }

        guildConfig.autoRoleConfig.enabled = false;
        await guildConfig.save();

        const successEmbed = Utils.createSuccessEmbed(
            "Auto-role assignment has been disabled.",
            `${config.emojis.success} Auto-Role Disabled`
        );

        await interaction.reply({ embeds: [successEmbed] });

        Utils.log(
            `${Utils.formatUser(interaction.user)} disabled auto-role in ${
                interaction.guild.name
            }`
        );
    },

    async handleStatus(interaction) {
        const guildConfig = await GuildConfig.findOne({
            guildId: interaction.guild.id,
        });

        if (!guildConfig || !guildConfig.autoRoleConfig.roleId) {
            const statusEmbed = Utils.createInfoEmbed(
                "Auto-role is not configured for this server.\nUse `/autorole set` to configure it.",
                "Auto-Role Status"
            );
            await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
            return;
        }

        const role = interaction.guild.roles.cache.get(
            guildConfig.autoRoleConfig.roleId
        );
        const botRole = guildConfig.autoRoleConfig.botRoleId
            ? interaction.guild.roles.cache.get(
                  guildConfig.autoRoleConfig.botRoleId
              )
            : null;

        const statusEmbed = Utils.createInfoEmbed(
            `**Status:** ${
                guildConfig.autoRoleConfig.enabled
                    ? "✅ Enabled"
                    : "❌ Disabled"
            }\n` +
                `**Member Role:** ${role ? role : "❌ Role not found"}\n` +
                `**Bot Role:** ${botRole ? botRole : "Not set"}\n\n` +
                `${
                    guildConfig.autoRoleConfig.enabled
                        ? "New members will automatically receive the configured role(s)."
                        : "Auto-role is disabled. Use `/autorole enable` to activate it."
                }`,
            "Auto-Role Configuration"
        );

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    },

    async handleTest(interaction) {
        const guildConfig = await GuildConfig.findOne({
            guildId: interaction.guild.id,
        });

        if (
            !guildConfig ||
            !guildConfig.autoRoleConfig.enabled ||
            !guildConfig.autoRoleConfig.roleId
        ) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Auto-role is not configured or enabled."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        const role = interaction.guild.roles.cache.get(
            guildConfig.autoRoleConfig.roleId
        );
        if (!role) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "The configured auto-role no longer exists."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        const member = interaction.member;

        // Check if user already has the role
        if (member.roles.cache.has(role.id)) {
            await interaction.reply({
                embeds: [
                    Utils.createWarningEmbed(
                        `You already have the ${role} role.`
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        try {
            await member.roles.add(role, "Auto-role test by administrator");

            const successEmbed = Utils.createSuccessEmbed(
                `Successfully assigned the ${role} role to you!`,
                `${config.emojis.success} Auto-Role Test Successful`
            );

            await interaction.reply({
                embeds: [successEmbed],
                ephemeral: true,
            });

            Utils.log(
                `${Utils.formatUser(interaction.user)} tested auto-role in ${
                    interaction.guild.name
                }`
            );
        } catch (error) {
            Utils.log(`Failed to test auto-role: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to assign the role. Please check my permissions and role hierarchy."
                    ),
                ],
                ephemeral: true,
            });
        }
    },
};
