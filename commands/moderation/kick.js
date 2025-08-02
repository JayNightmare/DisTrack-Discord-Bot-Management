const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");
const Logger = require("../../utils/Logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member from the server")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to kick")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for the kick")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const targetUser = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            const targetMember = await interaction.guild.members.fetch(
                targetUser.id
            );

            // Check if target is kickable
            if (!targetMember.kickable) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "I cannot kick this user. They may have higher permissions than me."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Check if target is bot owner
            if (targetUser.id === interaction.client.user.id) {
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed("I cannot kick myself!")],
                    ephemeral: true,
                });
                return;
            }

            // Check if target has admin permissions (extra safety)
            if (Utils.hasAdminPermissions(targetMember)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "I cannot kick other administrators."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Attempt to DM the user before kicking
            try {
                const dmEmbed = Utils.createWarningEmbed(
                    `You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`,
                    "🦶 You have been kicked"
                );
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                Utils.log(
                    `Could not DM ${Utils.formatUser(targetUser)} about kick`,
                    "WARN"
                );
            }

            // Kick the user
            await targetMember.kick(reason);

            // Log the action to audit log
            await Logger.logAction({
                guildId: interaction.guild.id,
                action: "kick",
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                reason,
                details: {
                    targetTag: targetUser.tag,
                },
            });

            // Create success embed
            const successEmbed = Utils.createSuccessEmbed(
                `**User:** ${Utils.formatUser(
                    targetUser
                )}\n**Reason:** ${reason}\n**Moderator:** ${Utils.formatUser(
                    interaction.user
                )}`,
                "🦶 User Kicked"
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} kicked ${Utils.formatUser(targetUser)} for: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error kicking user: ${error.message}`, "ERROR");

            if (error.code === 10007) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "User not found in this server."
                        ),
                    ],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Failed to kick the user. Please check my permissions."
                        ),
                    ],
                    ephemeral: true,
                });
            }
        }
    },
};
