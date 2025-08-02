const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const Logger = require("../../utils/Logger");
const Warning = require("../../models/Warning");
const Ticket = require("../../models/Ticket");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("View comprehensive server statistics")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("server")
                .setDescription("View general server statistics")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("moderation")
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
        .addSubcommand((subcommand) =>
            subcommand
                .setName("activity")
                .setDescription("View server activity statistics")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("tickets")
                .setDescription("View ticket system statistics")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const subcommand = interaction.options.getSubcommand();

        try {
            await interaction.deferReply({ ephemeral: true });

            switch (subcommand) {
                case "server":
                    await this.handleServer(interaction);
                    break;
                case "moderation":
                    await this.handleModeration(interaction);
                    break;
                case "activity":
                    await this.handleActivity(interaction);
                    break;
                case "tickets":
                    await this.handleTickets(interaction);
                    break;
                default:
                    await interaction.editReply({
                        embeds: [Utils.createErrorEmbed("Unknown subcommand.")],
                    });
            }
        } catch (error) {
            Utils.log(`Error in stats command: ${error.message}`, "ERROR");
            await interaction.editReply({
                embeds: [
                    Utils.createErrorEmbed(
                        "An error occurred while fetching statistics."
                    ),
                ],
            });
        }
    },

    async handleServer(interaction) {
        const guild = interaction.guild;

        // Fetch guild members if not cached
        if (!guild.members.cache.has(guild.ownerId)) {
            await guild.members.fetch();
        }

        // Calculate member statistics
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(
            (member) => !member.user.bot
        ).size;
        const bots = guild.members.cache.filter(
            (member) => member.user.bot
        ).size;

        // Status statistics
        const onlineMembers = guild.members.cache.filter(
            (member) =>
                member.presence?.status && member.presence.status !== "offline"
        ).size;

        // Channel statistics
        const textChannels = guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildText
        ).size;
        const voiceChannels = guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildVoice
        ).size;
        const categories = guild.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildCategory
        ).size;

        // Role statistics
        const totalRoles = guild.roles.cache.size - 1; // Exclude @everyone
        const assignedRoles = new Set();
        guild.members.cache.forEach((member) => {
            member.roles.cache.forEach((role) => {
                if (role.id !== guild.roles.everyone.id) {
                    assignedRoles.add(role.id);
                }
            });
        });

        // Server boost information
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boosters = guild.members.cache.filter(
            (member) => member.premiumSince
        ).size;

        // Features
        const features = guild.features;
        const verificationLevel = guild.verificationLevel;
        const explicitContentFilter = guild.explicitContentFilter;

        const embed = new EmbedBuilder()
            .setTitle(`📊 Server Statistics - ${guild.name}`)
            .setColor(config.colors.primary)
            .setThumbnail(guild.iconURL())
            .setTimestamp()
            .setFooter({
                text: `Server ID: ${guild.id}`,
                iconURL: guild.iconURL(),
            });

        // Basic information
        embed.addFields(
            {
                name: "👥 Members",
                value:
                    `**Total:** ${totalMembers.toLocaleString()}\n` +
                    `**Humans:** ${humans.toLocaleString()}\n` +
                    `**Bots:** ${bots.toLocaleString()}\n` +
                    `**Online:** ${onlineMembers.toLocaleString()}`,
                inline: true,
            },
            {
                name: "📺 Channels",
                value:
                    `**Text:** ${textChannels}\n` +
                    `**Voice:** ${voiceChannels}\n` +
                    `**Categories:** ${categories}\n` +
                    `**Total:** ${guild.channels.cache.size}`,
                inline: true,
            },
            {
                name: "🎭 Roles",
                value:
                    `**Total:** ${totalRoles}\n` +
                    `**In Use:** ${assignedRoles.size}\n` +
                    `**Unused:** ${totalRoles - assignedRoles.size}`,
                inline: true,
            }
        );

        // Server boost information
        if (boostLevel > 0 || boostCount > 0) {
            embed.addFields({
                name: "💎 Server Boost",
                value:
                    `**Level:** ${boostLevel}\n` +
                    `**Boosts:** ${boostCount}\n` +
                    `**Boosters:** ${boosters}`,
                inline: true,
            });
        }

        // Server settings
        const verificationLevels = {
            0: "None",
            1: "Low",
            2: "Medium",
            3: "High",
            4: "Very High",
        };

        const contentFilters = {
            0: "Disabled",
            1: "Members without roles",
            2: "All members",
        };

        embed.addFields({
            name: "🔒 Security",
            value:
                `**Verification:** ${verificationLevels[verificationLevel]}\n` +
                `**Content Filter:** ${contentFilters[explicitContentFilter]}\n` +
                `**2FA Required:** ${guild.mfaLevel === 1 ? "Yes" : "No"}`,
            inline: true,
        });

        // Server creation and owner
        const owner = await guild.fetchOwner().catch(() => null);
        embed.addFields({
            name: "📅 Server Info",
            value:
                `**Created:** <t:${Math.floor(
                    guild.createdTimestamp / 1000
                )}:F>\n` +
                `**Owner:** ${owner ? owner.user.tag : "Unknown"}\n` +
                `**Region:** ${guild.preferredLocale || "Unknown"}`,
            inline: false,
        });

        // Notable features
        if (features.length > 0) {
            const featureNames = features
                .map((feature) =>
                    feature
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase())
                )
                .slice(0, 5);

            embed.addFields({
                name: "✨ Features",
                value:
                    featureNames.join(", ") +
                    (features.length > 5 ? "..." : ""),
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleModeration(interaction) {
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

        // Get audit log statistics
        const auditStats = await Logger.getActionStats(
            interaction.guild.id,
            sinceDate
        );

        // Get warning statistics
        const warningQuery = { guildId: interaction.guild.id };
        if (sinceDate) {
            warningQuery.createdAt = { $gte: sinceDate };
        }

        const totalWarnings = await Warning.countDocuments(warningQuery);
        const activeWarnings = await Warning.countDocuments({
            ...warningQuery,
            active: true,
        });

        // Warning severity breakdown
        const warningSeverity = await Warning.aggregate([
            { $match: warningQuery },
            { $group: { _id: "$severity", count: { $sum: 1 } } },
        ]);

        const embed = new EmbedBuilder()
            .setTitle(`⚖️ Moderation Statistics - ${interaction.guild.name}`)
            .setColor(config.colors.warning)
            .setTimestamp()
            .setFooter({
                text: `Period: ${periodName}`,
                iconURL: interaction.guild.iconURL(),
            });

        if (auditStats.totalActions === 0 && totalWarnings === 0) {
            embed.setDescription(
                "No moderation actions found for this period."
            );
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Action summary
        embed.addFields({
            name: "📊 Overview",
            value:
                `**Total Actions:** ${auditStats.totalActions}\n` +
                `**Total Warnings:** ${totalWarnings}\n` +
                `**Active Warnings:** ${activeWarnings}\n` +
                `**Action Types:** ${
                    Object.keys(auditStats.actionCounts).length
                }`,
            inline: false,
        });

        // Action breakdown
        if (auditStats.totalActions > 0) {
            const actionStats = [];
            const sortedActions = Object.entries(auditStats.actionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8);

            for (const [action, count] of sortedActions) {
                const emoji = Logger.getActionEmoji(action);
                const name = Logger.getActionName(action);
                actionStats.push(`${emoji} ${name}: **${count}**`);
            }

            embed.addFields({
                name: "📈 Actions by Type",
                value: actionStats.join("\n"),
                inline: true,
            });
        }

        // Warning severity breakdown
        if (totalWarnings > 0) {
            const severityStats = [];
            const severityMap = {
                low: "🟢 Low",
                medium: "🟡 Medium",
                high: "🟠 High",
                critical: "🔴 Critical",
            };

            for (const { _id: severity, count } of warningSeverity) {
                const displayName = severityMap[severity] || severity;
                severityStats.push(`${displayName}: **${count}**`);
            }

            embed.addFields({
                name: "⚠️ Warning Severity",
                value: severityStats.join("\n") || "No warnings",
                inline: true,
            });
        }

        // Top moderators
        if (Object.keys(auditStats.moderatorCounts).length > 0) {
            const moderatorStats = [];
            const sortedModerators = Object.entries(auditStats.moderatorCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);

            for (const [moderatorId, count] of sortedModerators) {
                const moderator = await interaction.client.users
                    .fetch(moderatorId)
                    .catch(() => null);
                if (moderator) {
                    moderatorStats.push(`**${moderator.tag}:** ${count}`);
                }
            }

            embed.addFields({
                name: "👮 Most Active Moderators",
                value: moderatorStats.join("\n"),
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleActivity(interaction) {
        const guild = interaction.guild;

        // Member presence statistics
        const presenceStats = {
            online: 0,
            idle: 0,
            dnd: 0,
            offline: 0,
        };

        guild.members.cache.forEach((member) => {
            if (member.user.bot) return;

            const status = member.presence?.status || "offline";
            if (presenceStats.hasOwnProperty(status)) {
                presenceStats[status]++;
            } else {
                presenceStats.offline++;
            }
        });

        // Activity type statistics
        const activityStats = {
            playing: 0,
            streaming: 0,
            listening: 0,
            watching: 0,
            custom: 0,
            competing: 0,
        };

        guild.members.cache.forEach((member) => {
            if (member.user.bot || !member.presence?.activities) return;

            member.presence.activities.forEach((activity) => {
                const type = activity.type;
                switch (type) {
                    case 0:
                        activityStats.playing++;
                        break;
                    case 1:
                        activityStats.streaming++;
                        break;
                    case 2:
                        activityStats.listening++;
                        break;
                    case 3:
                        activityStats.watching++;
                        break;
                    case 4:
                        activityStats.custom++;
                        break;
                    case 5:
                        activityStats.competing++;
                        break;
                }
            });
        });

        // Voice channel activity
        let voiceMembers = 0;
        const voiceChannelActivity = [];

        guild.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildVoice)
            .forEach((channel) => {
                if (channel.members.size > 0) {
                    voiceMembers += channel.members.size;
                    voiceChannelActivity.push({
                        name: channel.name,
                        count: channel.members.size,
                    });
                }
            });

        // Sort voice channels by activity
        voiceChannelActivity.sort((a, b) => b.count - a.count);

        const embed = new EmbedBuilder()
            .setTitle(`📈 Activity Statistics - ${guild.name}`)
            .setColor(config.colors.info)
            .setTimestamp()
            .setFooter({
                text: `Live data from ${guild.memberCount} members`,
                iconURL: guild.iconURL(),
            });

        // Member status
        embed.addFields({
            name: "🟢 Member Status",
            value:
                `🟢 **Online:** ${presenceStats.online}\n` +
                `🟡 **Idle:** ${presenceStats.idle}\n` +
                `🔴 **Do Not Disturb:** ${presenceStats.dnd}\n` +
                `⚫ **Offline:** ${presenceStats.offline}`,
            inline: true,
        });

        // Activity types
        const totalActivities = Object.values(activityStats).reduce(
            (a, b) => a + b,
            0
        );
        if (totalActivities > 0) {
            embed.addFields({
                name: "🎮 Activities",
                value:
                    `🎮 **Playing:** ${activityStats.playing}\n` +
                    `📺 **Watching:** ${activityStats.watching}\n` +
                    `🎵 **Listening:** ${activityStats.listening}\n` +
                    `🔴 **Streaming:** ${activityStats.streaming}\n` +
                    `🏆 **Competing:** ${activityStats.competing}\n` +
                    `✨ **Custom:** ${activityStats.custom}`,
                inline: true,
            });
        }

        // Voice activity
        embed.addFields({
            name: "🔊 Voice Activity",
            value:
                `**Members in Voice:** ${voiceMembers}\n` +
                `**Active Channels:** ${voiceChannelActivity.length}`,
            inline: true,
        });

        // Most active voice channels
        if (voiceChannelActivity.length > 0) {
            const topChannels = voiceChannelActivity
                .slice(0, 5)
                .map(
                    (channel) => `**${channel.name}:** ${channel.count} members`
                )
                .join("\n");

            embed.addFields({
                name: "🎙️ Busiest Voice Channels",
                value: topChannels,
                inline: false,
            });
        }

        // Role distribution (top roles by member count)
        const roleStats = guild.roles.cache
            .filter(
                (role) =>
                    role.id !== guild.roles.everyone.id && role.members.size > 0
            )
            .sort((a, b) => b.members.size - a.members.size)
            .slice(0, 5)
            .map((role) => `**${role.name}:** ${role.members.size} members`)
            .join("\n");

        if (roleStats) {
            embed.addFields({
                name: "🎭 Most Popular Roles",
                value: roleStats,
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleTickets(interaction) {
        const guildId = interaction.guild.id;

        // Get ticket statistics
        const totalTickets = await Ticket.countDocuments({ guildId });
        const openTickets = await Ticket.countDocuments({
            guildId,
            status: "open",
        });
        const closedTickets = await Ticket.countDocuments({
            guildId,
            status: "closed",
        });

        // Get tickets created in different time periods
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const ticketsToday = await Ticket.countDocuments({
            guildId,
            createdAt: { $gte: oneDayAgo },
        });

        const ticketsThisWeek = await Ticket.countDocuments({
            guildId,
            createdAt: { $gte: oneWeekAgo },
        });

        const ticketsThisMonth = await Ticket.countDocuments({
            guildId,
            createdAt: { $gte: oneMonthAgo },
        });

        // Get average response time (time between creation and first staff message)
        const recentTickets = await Ticket.find({
            guildId,
            status: "closed",
            closedAt: { $exists: true },
        })
            .sort({ createdAt: -1 })
            .limit(10);

        let avgResponseTime = 0;
        let avgResolutionTime = 0;

        if (recentTickets.length > 0) {
            const responseTimes = [];
            const resolutionTimes = [];

            recentTickets.forEach((ticket) => {
                if (ticket.closedAt) {
                    const resolutionTime =
                        ticket.closedAt.getTime() - ticket.createdAt.getTime();
                    resolutionTimes.push(resolutionTime);
                }
            });

            if (resolutionTimes.length > 0) {
                avgResolutionTime =
                    resolutionTimes.reduce((a, b) => a + b, 0) /
                    resolutionTimes.length;
            }
        }

        // Get tickets by creator (most frequent ticket creators)
        const ticketCreators = await Ticket.aggregate([
            { $match: { guildId } },
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket System Statistics - ${interaction.guild.name}`)
            .setColor(config.colors.info)
            .setTimestamp()
            .setFooter({
                text: `Total tickets created: ${totalTickets}`,
                iconURL: interaction.guild.iconURL(),
            });

        if (totalTickets === 0) {
            embed.setDescription("No tickets have been created yet.");
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Overview
        embed.addFields({
            name: "📊 Overview",
            value:
                `**Total Tickets:** ${totalTickets}\n` +
                `**Open:** ${openTickets}\n` +
                `**Closed:** ${closedTickets}\n` +
                `**Open Rate:** ${
                    totalTickets > 0
                        ? Math.round((openTickets / totalTickets) * 100)
                        : 0
                }%`,
            inline: true,
        });

        // Activity
        embed.addFields({
            name: "📈 Recent Activity",
            value:
                `**Today:** ${ticketsToday}\n` +
                `**This Week:** ${ticketsThisWeek}\n` +
                `**This Month:** ${ticketsThisMonth}`,
            inline: true,
        });

        // Performance metrics
        if (avgResolutionTime > 0) {
            embed.addFields({
                name: "⏱️ Performance",
                value:
                    `**Avg Resolution Time:** ${Utils.formatDuration(
                        avgResolutionTime
                    )}\n` +
                    `**Based on:** ${recentTickets.length} recent tickets`,
                inline: true,
            });
        }

        // Top ticket creators
        if (ticketCreators.length > 0) {
            const creatorList = [];
            for (const creator of ticketCreators) {
                const user = await interaction.client.users
                    .fetch(creator._id)
                    .catch(() => null);
                if (user) {
                    creatorList.push(
                        `**${user.tag}:** ${creator.count} tickets`
                    );
                }
            }

            if (creatorList.length > 0) {
                embed.addFields({
                    name: "👥 Most Active Users",
                    value: creatorList.join("\n"),
                    inline: false,
                });
            }
        }

        // Recent ticket trend
        const recentDays = 7;
        const dailyTickets = [];

        for (let i = recentDays - 1; i >= 0; i--) {
            const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const dayCount = await Ticket.countDocuments({
                guildId,
                createdAt: { $gte: dayStart, $lt: dayEnd },
            });

            dailyTickets.push(dayCount);
        }

        const trendEmoji = dailyTickets
            .map((count) => {
                if (count === 0) return "⚫";
                else if (count <= 2) return "🟢";
                else if (count <= 5) return "🟡";
                else return "🔴";
            })
            .join("");

        embed.addFields({
            name: "📅 7-Day Trend",
            value:
                `${trendEmoji}\n` +
                `**Daily Average:** ${Math.round(
                    dailyTickets.reduce((a, b) => a + b, 0) / recentDays
                )}`,
            inline: false,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
