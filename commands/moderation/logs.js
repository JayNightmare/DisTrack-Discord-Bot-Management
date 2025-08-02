const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const Logger = require("../../utils/Logger");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("logs")
        .setDescription("View server audit logs and moderation history")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("recent")
                .setDescription("View recent audit logs")
                .addIntegerOption((option) =>
                    option
                        .setName("limit")
                        .setDescription("Number of logs to show (1-25)")
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Filter by action type")
                        .setRequired(false)
                        .addChoices(
                            { name: "Ban", value: "ban" },
                            { name: "Unban", value: "unban" },
                            { name: "Kick", value: "kick" },
                            { name: "Timeout", value: "timeout" },
                            { name: "Remove Timeout", value: "remove_timeout" },
                            { name: "Warning Added", value: "warn_add" },
                            { name: "Warning Removed", value: "warn_remove" },
                            { name: "Warnings Cleared", value: "warn_clear" },
                            { name: "Messages Purged", value: "purge" }
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("user")
                .setDescription("View logs for a specific user")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("User to view logs for")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("limit")
                        .setDescription("Number of logs to show (1-25)")
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("moderator")
                .setDescription("View logs by a specific moderator")
                .addUserOption((option) =>
                    option
                        .setName("moderator")
                        .setDescription("Moderator to view logs for")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("limit")
                        .setDescription("Number of logs to show (1-25)")
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("View moderation statistics")
                .addStringOption((option) =>
                    option
                        .setName("period")
                        .setDescription("Time period for statistics")
                        .setRequired(false)
                        .addChoices(
                            { name: "Last 24 Hours", value: "24h" },
                            { name: "Last 7 Days", value: "7d" },
                            { name: "Last 30 Days", value: "30d" },
                            { name: "All Time", value: "all" }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            await interaction.deferReply({ ephemeral: true });

            switch (subcommand) {
                case "recent":
                    await this.handleRecent(interaction);
                    break;
                case "user":
                    await this.handleUser(interaction);
                    break;
                case "moderator":
                    await this.handleModerator(interaction);
                    break;
                case "stats":
                    await this.handleStats(interaction);
                    break;
                default:
                    await interaction.editReply({
                        embeds: [Utils.createErrorEmbed("Unknown subcommand.")],
                    });
            }
        } catch (error) {
            Utils.log(`Error in logs command: ${error.message}`, "ERROR");
            await interaction.editReply({
                embeds: [
                    Utils.createErrorEmbed(
                        "An error occurred while fetching logs."
                    ),
                ],
            });
        }
    },

    async handleRecent(interaction) {
        const limit = interaction.options.getInteger("limit") || 10;
        const action = interaction.options.getString("action");

        const logs = await Logger.getLogs(interaction.guild.id, limit, action);

        if (logs.length === 0) {
            await interaction.editReply({
                embeds: [
                    Utils.createInfoEmbed(
                        `No ${action ? `${action} ` : ""}logs found.`
                    ),
                ],
            });
            return;
        }

        const embed = await Logger.createLogEmbed(
            logs,
            interaction.guild,
            interaction.client
        );

        if (action) {
            embed.setTitle(
                `📋 ${Logger.getActionName(action)} Logs - ${
                    interaction.guild.name
                }`
            );
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleUser(interaction) {
        const targetUser = interaction.options.getUser("user");
        const limit = interaction.options.getInteger("limit") || 15;

        const logs = await Logger.getUserLogs(
            interaction.guild.id,
            targetUser.id,
            limit
        );

        if (logs.length === 0) {
            await interaction.editReply({
                embeds: [
                    Utils.createInfoEmbed(
                        `No logs found for ${targetUser.tag}.`
                    ),
                ],
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 User Logs - ${targetUser.tag}`)
            .setColor(config.colors.primary)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp()
            .setFooter({
                text: `${logs.length} entries for ${targetUser.tag}`,
                iconURL: interaction.guild.iconURL(),
            });

        for (const log of logs.slice(0, 10)) {
            const moderator = await interaction.client.users
                .fetch(log.moderatorId)
                .catch(() => null);
            const actionEmoji = Logger.getActionEmoji(log.action);
            const actionName = Logger.getActionName(log.action);

            embed.addFields({
                name: `${actionEmoji} ${actionName}`,
                value:
                    `**Moderator:** ${
                        moderator ? moderator.tag : "Unknown"
                    }\n` +
                    `**Reason:** ${Utils.truncateText(log.reason, 100)}\n` +
                    `**Time:** <t:${Math.floor(
                        log.createdAt.getTime() / 1000
                    )}:R>`,
                inline: false,
            });
        }

        if (logs.length > 10) {
            embed.setDescription(
                `Showing 10 of ${logs.length} log entries for this user.`
            );
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleModerator(interaction) {
        const moderator = interaction.options.getUser("moderator");
        const limit = interaction.options.getInteger("limit") || 15;

        const logs = await Logger.getModeratorLogs(
            interaction.guild.id,
            moderator.id,
            limit
        );

        if (logs.length === 0) {
            await interaction.editReply({
                embeds: [
                    Utils.createInfoEmbed(
                        `No moderation logs found for ${moderator.tag}.`
                    ),
                ],
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Moderator Logs - ${moderator.tag}`)
            .setColor(config.colors.primary)
            .setThumbnail(moderator.displayAvatarURL())
            .setTimestamp()
            .setFooter({
                text: `${logs.length} actions by ${moderator.tag}`,
                iconURL: interaction.guild.iconURL(),
            });

        for (const log of logs.slice(0, 10)) {
            const target = await interaction.client.users
                .fetch(log.targetId)
                .catch(() => null);
            const actionEmoji = Logger.getActionEmoji(log.action);
            const actionName = Logger.getActionName(log.action);

            embed.addFields({
                name: `${actionEmoji} ${actionName}`,
                value:
                    `**Target:** ${
                        target
                            ? `${target.tag} (${target.id})`
                            : `Unknown (${log.targetId})`
                    }\n` +
                    `**Reason:** ${Utils.truncateText(log.reason, 100)}\n` +
                    `**Time:** <t:${Math.floor(
                        log.createdAt.getTime() / 1000
                    )}:R>`,
                inline: false,
            });
        }

        if (logs.length > 10) {
            embed.setDescription(
                `Showing 10 of ${logs.length} actions by this moderator.`
            );
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStats(interaction) {
        const period = interaction.options.getString("period") || "30d";

        let sinceDate = null;
        let periodName = "All Time";

        if (period !== "all") {
            const periodMs = Utils.parseDuration(period);
            sinceDate = new Date(Date.now() - periodMs);

            const periodNames = {
                "24h": "Last 24 Hours",
                "7d": "Last 7 Days",
                "30d": "Last 30 Days",
            };
            periodName = periodNames[period] || period;
        }

        const stats = await Logger.getActionStats(
            interaction.guild.id,
            sinceDate
        );

        const embed = new EmbedBuilder()
            .setTitle(`📊 Moderation Statistics - ${interaction.guild.name}`)
            .setColor(config.colors.info)
            .setTimestamp()
            .setFooter({
                text: `Period: ${periodName}`,
                iconURL: interaction.guild.iconURL(),
            });

        if (stats.totalActions === 0) {
            embed.setDescription(
                "No moderation actions found for this period."
            );
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Action statistics
        const actionStats = [];
        const sortedActions = Object.entries(stats.actionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        for (const [action, count] of sortedActions) {
            const emoji = Logger.getActionEmoji(action);
            const name = Logger.getActionName(action);
            actionStats.push(`${emoji} **${name}:** ${count}`);
        }

        embed.addFields({
            name: "📈 Actions by Type",
            value: actionStats.join("\n") || "No actions recorded",
            inline: false,
        });

        // Top moderators
        const moderatorStats = [];
        const sortedModerators = Object.entries(stats.moderatorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        for (const [moderatorId, count] of sortedModerators) {
            const moderator = await interaction.client.users
                .fetch(moderatorId)
                .catch(() => null);
            if (moderator) {
                moderatorStats.push(`**${moderator.tag}:** ${count} actions`);
            }
        }

        if (moderatorStats.length > 0) {
            embed.addFields({
                name: "👮 Top Moderators",
                value: moderatorStats.join("\n"),
                inline: false,
            });
        }

        embed.addFields({
            name: "📋 Summary",
            value:
                `**Total Actions:** ${stats.totalActions}\n` +
                `**Action Types:** ${
                    Object.keys(stats.actionCounts).length
                }\n` +
                `**Active Moderators:** ${
                    Object.keys(stats.moderatorCounts).length
                }`,
            inline: false,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
