const mongoose = require("mongoose");

/**
 * Audit Log Schema for tracking all server actions
 */
const auditLogSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                "ban",
                "unban",
                "kick",
                "timeout",
                "remove_timeout",
                "warn_add",
                "warn_remove",
                "warn_clear",
                "role_add",
                "role_remove",
                "autorole_set",
                "ticket_create",
                "ticket_close",
                "ticket_delete",
                "message_delete",
                "message_bulk_delete",
                "channel_create",
                "channel_delete",
                "channel_update",
                "member_join",
                "member_leave",
                "config_update",
                "bot_command",
            ],
        },
        moderatorId: {
            type: String,
            required: true,
        },
        targetId: {
            type: String,
            default: null, // User ID, Channel ID, Role ID, etc.
        },
        targetType: {
            type: String,
            enum: ["user", "channel", "role", "message", "guild", "other"],
            default: "user",
        },
        reason: {
            type: String,
            default: null,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        metadata: {
            channelId: String,
            messageId: String,
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            duration: Number,
            count: Number,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
auditLogSchema.index({ guildId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ moderatorId: 1 });
auditLogSchema.index({ targetId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
