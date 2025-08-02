const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const Warning = require("../../models/Warning");
const AuditLog = require("../../models/AuditLog");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Manage user warnings")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add a warning to a user")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("User to warn")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("Reason for the warning")
                        .setRequired(true)
                        .setMaxLength(1000)
                )
                .addStringOption((option) =>
                    option
                        .setName("severity")
                        .setDescription("Warning severity")
                        .setRequired(false)
                        .addChoices(
                            { name: "Low", value: "low" },
                            { name: "Medium", value: "medium" },
                            { name: "High", value: "high" },
                            { name: "Critical", value: "critical" }
                        )
                )
                .addStringOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("Warning expiration (e.g., 30d, 6m)")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("List warnings for a user")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("User to check warnings for")
                        .setRequired(true)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("active-only")
                        .setDescription("Show only active warnings")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove a specific warning")
                .addStringOption((option) =>
                    option
                        .setName("warning-id")
                        .setDescription("Warning ID to remove")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("Reason for removing the warning")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("clear")
                .setDescription("Clear all warnings for a user")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("User to clear warnings for")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription("Reason for clearing warnings")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("Get detailed information about a warning")
                .addStringOption((option) =>
                    option
                        .setName("warning-id")
                        .setDescription("Warning ID to view")
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "add":
                    await this.handleAdd(interaction);
                    break;
                case "list":
                    await this.handleList(interaction);
                    break;
                case "remove":
                    await this.handleRemove(interaction);
                    break;
                case "clear":
                    await this.handleClear(interaction);
                    break;
                case "info":
                    await this.handleInfo(interaction);
                    break;
                default:
                    await interaction.reply({
                        embeds: [Utils.createErrorEmbed("Unknown subcommand.")],
                        ephemeral: true,
                    });
            }
        } catch (error) {
            Utils.log(`Error in warn command: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "An error occurred while processing the warning command."
                    ),
                ],
                ephemeral: true,
            });
        }
    },

    async handleAdd(interaction) {
        const targetUser = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const severity = interaction.options.getString("severity") || "medium";
        const duration = interaction.options.getString("duration");

        // Validate target user
        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("You cannot warn yourself.")],
                ephemeral: true,
            });
            return;
        }

        if (targetUser.bot) {
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("You cannot warn bots.")],
                ephemeral: true,
            });
            return;
        }

        // Check if target is an admin (extra safety)
        try {
            const targetMember = await interaction.guild.members.fetch(
                targetUser.id
            );
            if (Utils.hasAdminPermissions(targetMember)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "You cannot warn other administrators."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }
        } catch (error) {
            // User might not be in the server, continue anyway
        }

        // Parse duration if provided
        let expiresAt = null;
        if (duration) {
            const durationMs = Utils.parseExtendedDuration(duration);
            if (!durationMs) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Invalid duration format. Use formats like: 30d, 6M, 1y"
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }
            expiresAt = new Date(Date.now() + durationMs);
        }

        // Generate warning ID
        const warningCount = await Warning.countDocuments({
            guildId: interaction.guild.id,
        });
        const warningId = `warn-${String(warningCount + 1).padStart(4, "0")}`;

        // Create warning
        const warning = new Warning({
            warningId,
            userId: targetUser.id,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            reason,
            severity,
            expiresAt,
        });

        await warning.save();

        // Log the action
        await AuditLog.create({
            guildId: interaction.guild.id,
            action: "warn_add",
            moderatorId: interaction.user.id,
            targetId: targetUser.id,
            reason,
            details: {
                warningId,
                severity,
                expiresAt,
            },
        });

        // Get total active warnings for user
        const activeWarnings = await Warning.countDocuments({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            active: true,
        });

        // Create success embed
        const embed = Utils.createSuccessEmbed(
            `**User:** ${Utils.formatUser(targetUser)}\n` +
                `**Warning ID:** ${warningId}\n` +
                `**Severity:** ${
                    severity.charAt(0).toUpperCase() + severity.slice(1)
                }\n` +
                `**Reason:** ${reason}\n` +
                `${
                    expiresAt
                        ? `**Expires:** <t:${Math.floor(
                              expiresAt.getTime() / 1000
                          )}:F>\n`
                        : ""
                }` +
                `**Total Active Warnings:** ${activeWarnings}\n` +
                `**Moderator:** ${Utils.formatUser(interaction.user)}`,
            `⚠️ Warning Added`
        );

        await interaction.reply({ embeds: [embed] });

        // Try to DM the user
        try {
            const dmEmbed = Utils.createWarningEmbed(
                `You have received a warning in **${interaction.guild.name}**\n\n` +
                    `**Warning ID:** ${warningId}\n` +
                    `**Severity:** ${
                        severity.charAt(0).toUpperCase() + severity.slice(1)
                    }\n` +
                    `**Reason:** ${reason}\n` +
                    `${
                        expiresAt
                            ? `**Expires:** <t:${Math.floor(
                                  expiresAt.getTime() / 1000
                              )}:F>\n`
                            : ""
                    }` +
                    `**Total Active Warnings:** ${activeWarnings}`,
                "⚠️ Warning Received"
            );
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            Utils.log(
                `Could not DM warning to ${Utils.formatUser(targetUser)}`,
                "WARN"
            );
        }

        Utils.log(
            `${Utils.formatUser(interaction.user)} warned ${Utils.formatUser(
                targetUser
            )}: ${reason}`
        );
    },

    async handleList(interaction) {
        const targetUser = interaction.options.getUser("user");
        const activeOnly =
            interaction.options.getBoolean("active-only") ?? true;

        const query = {
            userId: targetUser.id,
            guildId: interaction.guild.id,
        };

        if (activeOnly) {
            query.active = true;
        }

        const warnings = await Warning.find(query)
            .sort({ createdAt: -1 })
            .limit(10);

        if (warnings.length === 0) {
            await interaction.reply({
                embeds: [
                    Utils.createInfoEmbed(
                        `${targetUser.tag} has no ${
                            activeOnly ? "active " : ""
                        }warnings.`
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warnings for ${targetUser.tag}`)
            .setColor(config.colors.warning)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp()
            .setFooter({
                text: `Showing ${warnings.length} ${
                    activeOnly ? "active " : ""
                }warnings`,
                iconURL: interaction.guild.iconURL(),
            });

        for (const warning of warnings.slice(0, 5)) {
            const moderator = await interaction.client.users
                .fetch(warning.moderatorId)
                .catch(() => null);
            const isExpired =
                warning.expiresAt && warning.expiresAt < new Date();

            embed.addFields({
                name: `${warning.active && !isExpired ? "🟡" : "🔴"} ${
                    warning.warningId
                }`,
                value:
                    `**Severity:** ${
                        warning.severity.charAt(0).toUpperCase() +
                        warning.severity.slice(1)
                    }\n` +
                    `**Reason:** ${Utils.truncateText(warning.reason, 100)}\n` +
                    `**Moderator:** ${
                        moderator ? moderator.tag : "Unknown"
                    }\n` +
                    `**Date:** <t:${Math.floor(
                        warning.createdAt.getTime() / 1000
                    )}:R>\n` +
                    `${
                        warning.expiresAt
                            ? `**Expires:** <t:${Math.floor(
                                  warning.expiresAt.getTime() / 1000
                              )}:R>\n`
                            : ""
                    }` +
                    `**Status:** ${
                        warning.active
                            ? isExpired
                                ? "Expired"
                                : "Active"
                            : "Removed"
                    }`,
                inline: false,
            });
        }

        if (warnings.length > 5) {
            embed.setDescription(
                `Showing 5 of ${warnings.length} warnings. Use \`/warn info\` for detailed information.`
            );
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleRemove(interaction) {
        const warningId = interaction.options.getString("warning-id");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        const warning = await Warning.findOne({
            warningId,
            guildId: interaction.guild.id,
        });

        if (!warning) {
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Warning not found.")],
                ephemeral: true,
            });
            return;
        }

        if (!warning.active) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "This warning has already been removed."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        // Remove the warning
        warning.active = false;
        warning.removedBy = interaction.user.id;
        warning.removedAt = new Date();
        warning.removedReason = reason;
        await warning.save();

        // Log the action
        await AuditLog.create({
            guildId: interaction.guild.id,
            action: "warn_remove",
            moderatorId: interaction.user.id,
            targetId: warning.userId,
            reason,
            details: {
                warningId,
                originalReason: warning.reason,
            },
        });

        const targetUser = await interaction.client.users
            .fetch(warning.userId)
            .catch(() => null);

        const embed = Utils.createSuccessEmbed(
            `**Warning ID:** ${warningId}\n` +
                `**User:** ${
                    targetUser ? Utils.formatUser(targetUser) : "Unknown User"
                }\n` +
                `**Removal Reason:** ${reason}\n` +
                `**Removed by:** ${Utils.formatUser(interaction.user)}`,
            "✅ Warning Removed"
        );

        await interaction.reply({ embeds: [embed] });

        Utils.log(
            `${Utils.formatUser(
                interaction.user
            )} removed warning ${warningId}: ${reason}`
        );
    },

    async handleClear(interaction) {
        const targetUser = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        const activeWarnings = await Warning.countDocuments({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            active: true,
        });

        if (activeWarnings === 0) {
            await interaction.reply({
                embeds: [
                    Utils.createInfoEmbed(
                        `${targetUser.tag} has no active warnings to clear.`
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        // Clear all active warnings
        await Warning.updateMany(
            {
                userId: targetUser.id,
                guildId: interaction.guild.id,
                active: true,
            },
            {
                active: false,
                removedBy: interaction.user.id,
                removedAt: new Date(),
                removedReason: reason,
            }
        );

        // Log the action
        await AuditLog.create({
            guildId: interaction.guild.id,
            action: "warn_clear",
            moderatorId: interaction.user.id,
            targetId: targetUser.id,
            reason,
            details: {
                clearedCount: activeWarnings,
            },
        });

        const embed = Utils.createSuccessEmbed(
            `**User:** ${Utils.formatUser(targetUser)}\n` +
                `**Warnings Cleared:** ${activeWarnings}\n` +
                `**Reason:** ${reason}\n` +
                `**Cleared by:** ${Utils.formatUser(interaction.user)}`,
            "✅ Warnings Cleared"
        );

        await interaction.reply({ embeds: [embed] });

        Utils.log(
            `${Utils.formatUser(
                interaction.user
            )} cleared ${activeWarnings} warnings for ${Utils.formatUser(
                targetUser
            )}: ${reason}`
        );
    },

    async handleInfo(interaction) {
        const warningId = interaction.options.getString("warning-id");

        const warning = await Warning.findOne({
            warningId,
            guildId: interaction.guild.id,
        });

        if (!warning) {
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Warning not found.")],
                ephemeral: true,
            });
            return;
        }

        const targetUser = await interaction.client.users
            .fetch(warning.userId)
            .catch(() => null);
        const moderator = await interaction.client.users
            .fetch(warning.moderatorId)
            .catch(() => null);
        const remover = warning.removedBy
            ? await interaction.client.users
                  .fetch(warning.removedBy)
                  .catch(() => null)
            : null;

        const isExpired = warning.expiresAt && warning.expiresAt < new Date();

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warning Details: ${warningId}`)
            .setColor(
                warning.active && !isExpired
                    ? config.colors.warning
                    : config.colors.error
            )
            .addFields(
                {
                    name: "User",
                    value: targetUser
                        ? `${targetUser.tag}\n${targetUser.id}`
                        : "Unknown User",
                    inline: true,
                },
                {
                    name: "Severity",
                    value:
                        warning.severity.charAt(0).toUpperCase() +
                        warning.severity.slice(1),
                    inline: true,
                },
                {
                    name: "Status",
                    value: warning.active
                        ? isExpired
                            ? "Expired"
                            : "Active"
                        : "Removed",
                    inline: true,
                },
                {
                    name: "Reason",
                    value: warning.reason,
                    inline: false,
                },
                {
                    name: "Moderator",
                    value: moderator
                        ? `${moderator.tag}\n${moderator.id}`
                        : "Unknown",
                    inline: true,
                },
                {
                    name: "Created",
                    value: `<t:${Math.floor(
                        warning.createdAt.getTime() / 1000
                    )}:F>`,
                    inline: true,
                }
            )
            .setTimestamp(warning.createdAt);

        if (warning.expiresAt) {
            embed.addFields({
                name: "Expires",
                value: `<t:${Math.floor(
                    warning.expiresAt.getTime() / 1000
                )}:F>`,
                inline: true,
            });
        }

        if (!warning.active && warning.removedBy) {
            embed.addFields(
                {
                    name: "Removed By",
                    value: remover
                        ? `${remover.tag}\n${remover.id}`
                        : "Unknown",
                    inline: true,
                },
                {
                    name: "Removed At",
                    value: `<t:${Math.floor(
                        warning.removedAt.getTime() / 1000
                    )}:F>`,
                    inline: true,
                },
                {
                    name: "Removal Reason",
                    value: warning.removedReason || "No reason provided",
                    inline: false,
                }
            );
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
