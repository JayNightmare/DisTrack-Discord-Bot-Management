/**
 * Configuration file for DisTrack Discord Bot
 * Contains all bot settings and constants
 */

require("dotenv").config();

module.exports = {
    // Bot Configuration
    token: process.env.TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    ownerId: process.env.OWNER_ID,

    // Database Configuration
    mongoUri: process.env.MONGODB_URI,

    // Server Configuration
    port: process.env.PORT || 7070,

    // Bot Settings
    bot: {
        presence: {
            status: "online",
            activities: [
                {
                    name: "Managing DisTrack Server",
                    type: "WATCHING",
                },
            ],
        },
    },

    // Moderation Settings
    moderation: {
        // Default timeout duration in minutes
        defaultTimeoutDuration: 10,
        // Maximum timeout duration in minutes (Discord limit is 28 days)
        maxTimeoutDuration: 40320,
    },

    // Ticket System Settings
    tickets: {
        // Ticket categories
        categories: [
            {
                name: "General Support",
                emoji: "🎫",
                description: "General help and support",
            },
            {
                name: "Bug Report",
                emoji: "🐛",
                description: "Report bugs or issues",
            },
            {
                name: "Feature Request",
                emoji: "💡",
                description: "Suggest new features",
            },
            {
                name: "Moderation Appeal",
                emoji: "⚖️",
                description: "Appeal moderation actions",
            },
        ],
        // Maximum tickets per user
        maxTicketsPerUser: 3,
        // Ticket auto-close time (in days)
        autoCloseAfterDays: 7,
    },

    // Colors for embeds
    colors: {
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffff00,
        info: 0x0099ff,
        primary: 0x7289da,
    },

    // Emojis
    emojis: {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        loading: "⏳",
        ticket: "🎫",
        lock: "🔒",
        unlock: "🔓",
        delete: "🗑️",
    },
};
