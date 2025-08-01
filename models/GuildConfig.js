const mongoose = require("mongoose");

/**
 * Guild Configuration Schema for storing per-guild settings
 */
const guildConfigSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true,
        },
        ticketConfig: {
            ticketCategoryId: {
                type: String,
                default: null,
            },
            ticketChannelId: {
                type: String,
                default: null,
            },
            staffRoleId: {
                type: String,
                default: null,
            },
            transcriptChannelId: {
                type: String,
                default: null,
            },
            ticketCounter: {
                type: Number,
                default: 0,
            },
        },
        moderationConfig: {
            modLogChannelId: {
                type: String,
                default: null,
            },
            muteRoleId: {
                type: String,
                default: null,
            },
        },
        welcomeConfig: {
            enabled: {
                type: Boolean,
                default: false,
            },
            channelId: {
                type: String,
                default: null,
            },
            message: {
                type: String,
                default: "Welcome {user} to {guild}!",
            },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
