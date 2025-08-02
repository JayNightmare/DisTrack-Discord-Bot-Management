const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const AuditLog = require("../../models/AuditLog");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Bulk delete messages with various filtering options")
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete (1-100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Only delete messages from this user")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("content")
                .setDescription("Only delete messages containing this text")
                .setRequired(false)
                .setMaxLength(100)
        )
        .addBooleanOption((option) =>
            option
                .setName("bots-only")
                .setDescription("Only delete messages from bots")
                .setRequired(false)
        )
        .addBooleanOption((option) =>
            option
                .setName("embeds-only")
                .setDescription("Only delete messages with embeds")
                .setRequired(false)
        )
        .addBooleanOption((option) =>
            option
                .setName("attachments-only")
                .setDescription("Only delete messages with attachments")
                .setRequired(false)
        )
        .addBooleanOption((option) =>
            option
                .setName("pins-only")
                .setDescription("Only delete pinned messages")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("older-than")
                .setDescription(
                    "Only delete messages older than this duration (e.g., 1h, 2d)"
                )
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("newer-than")
                .setDescription(
                    "Only delete messages newer than this duration (e.g., 1h, 2d)"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const amount = interaction.options.getInteger("amount");
        const targetUser = interaction.options.getUser("user");
        const content = interaction.options.getString("content");
        const botsOnly = interaction.options.getBoolean("bots-only") || false;
        const embedsOnly =
            interaction.options.getBoolean("embeds-only") || false;
        const attachmentsOnly =
            interaction.options.getBoolean("attachments-only") || false;
        const pinsOnly = interaction.options.getBoolean("pins-only") || false;
        const olderThan = interaction.options.getString("older-than");
        const newerThan = interaction.options.getString("newer-than");

        try {
            await interaction.deferReply({ ephemeral: true });

            // Validate time filters
            let olderThanDate = null;
            let newerThanDate = null;

            if (olderThan) {
                const olderThanMs = Utils.parseDuration(olderThan);
                if (!olderThanMs) {
                    await interaction.editReply({
                        embeds: [
                            Utils.createErrorEmbed(
                                'Invalid "older-than" duration format. Use formats like: 1h, 30m, 2d'
                            ),
                        ],
                    });
                    return;
                }
                olderThanDate = new Date(Date.now() - olderThanMs);
            }

            if (newerThan) {
                const newerThanMs = Utils.parseDuration(newerThan);
                if (!newerThanMs) {
                    await interaction.editReply({
                        embeds: [
                            Utils.createErrorEmbed(
                                'Invalid "newer-than" duration format. Use formats like: 1h, 30m, 2d'
                            ),
                        ],
                    });
                    return;
                }
                newerThanDate = new Date(Date.now() - newerThanMs);
            }

            // Validate conflicting filters
            if (
                olderThanDate &&
                newerThanDate &&
                olderThanDate <= newerThanDate
            ) {
                await interaction.editReply({
                    embeds: [
                        Utils.createErrorEmbed(
                            'The "older-than" date must be more recent than the "newer-than" date.'
                        ),
                    ],
                });
                return;
            }

            // Check channel permissions
            const channel = interaction.channel;
            const botMember = interaction.guild.members.me;

            if (
                !botMember
                    .permissionsIn(channel)
                    .has(["ManageMessages", "ReadMessageHistory"])
            ) {
                await interaction.editReply({
                    embeds: [
                        Utils.createErrorEmbed(
                            'I need "Manage Messages" and "Read Message History" permissions in this channel.'
                        ),
                    ],
                });
                return;
            }

            // Fetch messages
            const fetchLimit = Math.min(amount * 3, 100); // Fetch more than needed to account for filtering
            const messages = await channel.messages.fetch({
                limit: fetchLimit,
            });

            // Filter messages
            let filteredMessages = Array.from(messages.values());

            // Apply filters
            if (targetUser) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.author.id === targetUser.id
                );
            }

            if (content) {
                const searchContent = content.toLowerCase();
                filteredMessages = filteredMessages.filter((msg) =>
                    msg.content.toLowerCase().includes(searchContent)
                );
            }

            if (botsOnly) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.author.bot
                );
            }

            if (embedsOnly) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.embeds.length > 0
                );
            }

            if (attachmentsOnly) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.attachments.size > 0
                );
            }

            if (pinsOnly) {
                filteredMessages = filteredMessages.filter((msg) => msg.pinned);
            }

            if (olderThanDate) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.createdAt < olderThanDate
                );
            }

            if (newerThanDate) {
                filteredMessages = filteredMessages.filter(
                    (msg) => msg.createdAt > newerThanDate
                );
            }

            // Remove messages older than 14 days (Discord limitation)
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const deletableMessages = filteredMessages.filter(
                (msg) => msg.createdAt > twoWeeksAgo
            );
            const undeletableCount =
                filteredMessages.length - deletableMessages.length;

            // Limit to requested amount
            const messagesToDelete = deletableMessages.slice(0, amount);

            if (messagesToDelete.length === 0) {
                let reasonText =
                    "No messages found matching the specified criteria.";
                if (undeletableCount > 0) {
                    reasonText += ` (${undeletableCount} messages were older than 14 days and cannot be bulk deleted)`;
                }

                await interaction.editReply({
                    embeds: [Utils.createInfoEmbed(reasonText)],
                });
                return;
            }

            // Store deletion info for logging
            const deletionInfo = {
                count: messagesToDelete.length,
                channel: channel.name,
                channelId: channel.id,
                moderator: interaction.user.tag,
                moderatorId: interaction.user.id,
                filters: {
                    user: targetUser ? targetUser.tag : null,
                    content: content || null,
                    botsOnly,
                    embedsOnly,
                    attachmentsOnly,
                    pinsOnly,
                    olderThan: olderThan || null,
                    newerThan: newerThan || null,
                },
                undeletableCount,
            };

            // Delete messages
            let deletedCount = 0;
            if (messagesToDelete.length === 1) {
                // Single message deletion
                await messagesToDelete[0].delete();
                deletedCount = 1;
            } else {
                // Bulk deletion
                const deleted = await channel.bulkDelete(
                    messagesToDelete,
                    true
                );
                deletedCount = deleted.size;
            }

            // Log the action
            await AuditLog.create({
                guildId: interaction.guild.id,
                action: "purge",
                moderatorId: interaction.user.id,
                targetId: channel.id,
                reason: this.formatPurgeReason(deletionInfo.filters),
                details: {
                    channelName: channel.name,
                    deletedCount,
                    requestedAmount: amount,
                    filters: deletionInfo.filters,
                    undeletableCount,
                },
            });

            // Create success embed
            const embed = Utils.createSuccessEmbed(
                `**Messages Deleted:** ${deletedCount}\n` +
                    `**Channel:** ${channel}\n` +
                    `**Moderator:** ${Utils.formatUser(interaction.user)}\n` +
                    `${this.formatFiltersText(deletionInfo.filters)}\n` +
                    `${
                        undeletableCount > 0
                            ? `**Note:** ${undeletableCount} messages were older than 14 days and could not be deleted.\n`
                            : ""
                    }` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                `🗑️ Messages Purged`
            );

            await interaction.editReply({ embeds: [embed] });

            // Send a temporary message in the channel (will auto-delete)
            const channelNotification = await channel.send({
                embeds: [
                    Utils.createInfoEmbed(
                        `${deletedCount} messages were deleted by ${interaction.user.tag}`,
                        "🗑️ Messages Purged"
                    ),
                ],
            });

            // Delete the notification after 5 seconds
            setTimeout(async () => {
                try {
                    await channelNotification.delete();
                } catch (error) {
                    // Ignore errors (message might already be deleted)
                }
            }, 5000);

            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} purged ${deletedCount} messages in #${channel.name}`
            );
        } catch (error) {
            Utils.log(`Error in purge command: ${error.message}`, "ERROR");

            const errorMessage = error.message.includes(
                "You can only bulk delete messages that are under 14 days old"
            )
                ? "Cannot delete messages older than 14 days using bulk delete."
                : "An error occurred while deleting messages.";

            if (interaction.deferred) {
                await interaction.editReply({
                    embeds: [Utils.createErrorEmbed(errorMessage)],
                });
            } else {
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed(errorMessage)],
                    ephemeral: true,
                });
            }
        }
    },

    formatPurgeReason(filters) {
        const parts = [];

        if (filters.user) parts.push(`from ${filters.user}`);
        if (filters.content) parts.push(`containing "${filters.content}"`);
        if (filters.botsOnly) parts.push("from bots only");
        if (filters.embedsOnly) parts.push("with embeds only");
        if (filters.attachmentsOnly) parts.push("with attachments only");
        if (filters.pinsOnly) parts.push("pinned messages only");
        if (filters.olderThan) parts.push(`older than ${filters.olderThan}`);
        if (filters.newerThan) parts.push(`newer than ${filters.newerThan}`);

        return parts.length > 0
            ? `Purge: ${parts.join(", ")}`
            : "Bulk message purge";
    },

    formatFiltersText(filters) {
        const parts = [];

        if (filters.user) parts.push(`**User:** ${filters.user}`);
        if (filters.content)
            parts.push(`**Content Filter:** "${filters.content}"`);
        if (filters.botsOnly) parts.push("**Filter:** Bots only");
        if (filters.embedsOnly) parts.push("**Filter:** Embeds only");
        if (filters.attachmentsOnly) parts.push("**Filter:** Attachments only");
        if (filters.pinsOnly) parts.push("**Filter:** Pinned messages only");
        if (filters.olderThan)
            parts.push(`**Older Than:** ${filters.olderThan}`);
        if (filters.newerThan)
            parts.push(`**Newer Than:** ${filters.newerThan}`);

        return parts.length > 0 ? parts.join("\n") : "**Filters:** None";
    },
};
