const AuditLog = require("../models/AuditLog");
const { EmbedBuilder } = require("discord.js");
const config = require("../config/config");

/**
 * Advanced logging utility for moderation actions
 */
class Logger {
    /**
     * Log a moderation action
     * @param {Object} data - Log data
     * @param {string} data.guildId - Guild ID
     * @param {string} data.action - Action type
     * @param {string} data.moderatorId - Moderator user ID
     * @param {string} data.targetId - Target user/channel ID
     * @param {string} data.reason - Reason for action
     * @param {Object} data.details - Additional details
     * @returns {Promise<Object>} - Created log entry
     */
    static async logAction(data) {
        try {
            const logEntry = await AuditLog.create({
                guildId: data.guildId,
                action: data.action,
                moderatorId: data.moderatorId,
                targetId: data.targetId,
                reason: data.reason || "No reason provided",
                details: data.details || {},
            });

            return logEntry;
        } catch (error) {
            console.error("Error creating audit log:", error);
            return null;
        }
    }

    /**
     * Get recent logs for a guild
     * @param {string} guildId - Guild ID
     * @param {number} limit - Number of logs to fetch
     * @param {string} action - Filter by action type
     * @param {string} moderatorId - Filter by moderator
     * @param {string} targetId - Filter by target
     * @returns {Promise<Array>} - Array of log entries
     */
    static async getLogs(
        guildId,
        limit = 50,
        action = null,
        moderatorId = null,
        targetId = null
    ) {
        try {
            const query = { guildId };

            if (action) query.action = action;
            if (moderatorId) query.moderatorId = moderatorId;
            if (targetId) query.targetId = targetId;

            const logs = await AuditLog.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);

            return logs;
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            return [];
        }
    }

    /**
     * Get logs for a specific user (as target)
     * @param {string} guildId - Guild ID
     * @param {string} userId - User ID
     * @param {number} limit - Number of logs to fetch
     * @returns {Promise<Array>} - Array of log entries
     */
    static async getUserLogs(guildId, userId, limit = 25) {
        return this.getLogs(guildId, limit, null, null, userId);
    }

    /**
     * Get logs by moderator
     * @param {string} guildId - Guild ID
     * @param {string} moderatorId - Moderator ID
     * @param {number} limit - Number of logs to fetch
     * @returns {Promise<Array>} - Array of log entries
     */
    static async getModeratorLogs(guildId, moderatorId, limit = 25) {
        return this.getLogs(guildId, limit, null, moderatorId, null);
    }

    /**
     * Get action statistics for a guild
     * @param {string} guildId - Guild ID
     * @param {Date} since - Start date for statistics
     * @returns {Promise<Object>} - Statistics object
     */
    static async getActionStats(guildId, since = null) {
        try {
            const query = { guildId };
            if (since) {
                query.createdAt = { $gte: since };
            }

            const logs = await AuditLog.find(query);
            const stats = {};

            // Count actions by type
            logs.forEach((log) => {
                stats[log.action] = (stats[log.action] || 0) + 1;
            });

            // Count actions by moderator
            const moderatorStats = {};
            logs.forEach((log) => {
                moderatorStats[log.moderatorId] =
                    (moderatorStats[log.moderatorId] || 0) + 1;
            });

            return {
                totalActions: logs.length,
                actionCounts: stats,
                moderatorCounts: moderatorStats,
                period: since ? `Since ${since.toISOString()}` : "All time",
            };
        } catch (error) {
            console.error("Error getting action stats:", error);
            return {
                totalActions: 0,
                actionCounts: {},
                moderatorCounts: {},
                period: "Error",
            };
        }
    }

    /**
     * Create an embed for displaying log entries
     * @param {Array} logs - Array of log entries
     * @param {Object} guild - Discord guild object
     * @param {Object} client - Discord client
     * @returns {Promise<EmbedBuilder>} - Log embed
     */
    static async createLogEmbed(logs, guild, client) {
        const embed = new EmbedBuilder()
            .setTitle(`📋 Audit Logs - ${guild.name}`)
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({
                text: `${logs.length} entries`,
                iconURL: guild.iconURL(),
            });

        if (logs.length === 0) {
            embed.setDescription("No audit logs found.");
            return embed;
        }

        // Group recent logs (max 10 for embed limits)
        const displayLogs = logs.slice(0, 10);

        for (const log of displayLogs) {
            const moderator = await client.users
                .fetch(log.moderatorId)
                .catch(() => null);
            const target = await client.users
                .fetch(log.targetId)
                .catch(() => null);

            const actionEmoji = this.getActionEmoji(log.action);
            const actionName = this.getActionName(log.action);

            embed.addFields({
                name: `${actionEmoji} ${actionName}`,
                value:
                    `**Target:** ${
                        target
                            ? `${target.tag} (${target.id})`
                            : `Unknown (${log.targetId})`
                    }\n` +
                    `**Moderator:** ${
                        moderator ? moderator.tag : "Unknown"
                    }\n` +
                    `**Reason:** ${log.reason}\n` +
                    `**Time:** <t:${Math.floor(
                        log.createdAt.getTime() / 1000
                    )}:R>`,
                inline: false,
            });
        }

        if (logs.length > 10) {
            embed.setDescription(`Showing 10 of ${logs.length} log entries.`);
        }

        return embed;
    }

    /**
     * Get emoji for action type
     * @param {string} action - Action type
     * @returns {string} - Emoji
     */
    static getActionEmoji(action) {
        const emojis = {
            ban: "🔨",
            unban: "🔓",
            kick: "👢",
            timeout: "⏰",
            remove_timeout: "🔊",
            warn_add: "⚠️",
            warn_remove: "✅",
            warn_clear: "🧹",
            purge: "🗑️",
            ticket_create: "🎫",
            ticket_close: "🔒",
            ticket_delete: "❌",
            role_add: "➕",
            role_remove: "➖",
        };

        return emojis[action] || "📝";
    }

    /**
     * Get display name for action type
     * @param {string} action - Action type
     * @returns {string} - Display name
     */
    static getActionName(action) {
        const names = {
            ban: "Ban",
            unban: "Unban",
            kick: "Kick",
            timeout: "Timeout",
            remove_timeout: "Remove Timeout",
            warn_add: "Warning Added",
            warn_remove: "Warning Removed",
            warn_clear: "Warnings Cleared",
            purge: "Messages Purged",
            ticket_create: "Ticket Created",
            ticket_close: "Ticket Closed",
            ticket_delete: "Ticket Deleted",
            role_add: "Role Added",
            role_remove: "Role Removed",
        };

        return (
            names[action] || action.charAt(0).toUpperCase() + action.slice(1)
        );
    }

    /**
     * Clean up old log entries (optional maintenance)
     * @param {string} guildId - Guild ID
     * @param {number} daysToKeep - Number of days to keep logs
     * @returns {Promise<number>} - Number of deleted entries
     */
    static async cleanupOldLogs(guildId, daysToKeep = 90) {
        try {
            const cutoffDate = new Date(
                Date.now() - daysToKeep * 24 * 60 * 60 * 1000
            );

            const result = await AuditLog.deleteMany({
                guildId,
                createdAt: { $lt: cutoffDate },
            });

            return result.deletedCount;
        } catch (error) {
            console.error("Error cleaning up old logs:", error);
            return 0;
        }
    }
}

module.exports = Logger;
