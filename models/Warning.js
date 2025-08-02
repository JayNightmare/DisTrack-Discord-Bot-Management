const mongoose = require("mongoose");

/**
 * Warning Schema for storing user warnings
 */
const warningSchema = new mongoose.Schema(
    {
        warningId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            required: true,
        },
        guildId: {
            type: String,
            required: true,
        },
        moderatorId: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            maxLength: 1000,
        },
        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },
        active: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        removedBy: {
            type: String,
            default: null,
        },
        removedAt: {
            type: Date,
            default: null,
        },
        removedReason: {
            type: String,
            default: null,
        },
        actionTaken: {
            type: String,
            default: null, // 'timeout', 'kick', 'ban', etc.
        },
        evidence: {
            messageId: String,
            channelId: String,
            attachments: [String],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
warningSchema.index({ userId: 1, guildId: 1 });
warningSchema.index({ active: 1 });
warningSchema.index({ createdAt: -1 });
warningSchema.index({ expiresAt: 1 });

// Virtual for checking if warning is expired
warningSchema.virtual("isExpired").get(function () {
    return this.expiresAt && this.expiresAt < new Date();
});

module.exports = mongoose.model("Warning", warningSchema);
