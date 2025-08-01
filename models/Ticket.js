const mongoose = require("mongoose");

/**
 * Ticket Schema for storing ticket information
 */
const ticketSchema = new mongoose.Schema(
    {
        ticketId: {
            type: String,
            required: true,
            unique: true,
        },
        channelId: {
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
        category: {
            type: String,
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["open", "closed", "archived"],
            default: "open",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        assignedTo: {
            type: String,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        closedAt: {
            type: Date,
            default: null,
        },
        closedBy: {
            type: String,
            default: null,
        },
        messages: [
            {
                userId: String,
                username: String,
                content: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                attachments: [String],
            },
        ],
        notes: [
            {
                staffId: String,
                staffUsername: String,
                note: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
ticketSchema.index({ userId: 1, guildId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Ticket", ticketSchema);
