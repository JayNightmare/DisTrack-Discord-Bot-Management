const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../utils/Utils");
const Ticket = require("../models/Ticket");
const GuildConfig = require("../models/GuildConfig");
const config = require("../config/config");

/**
 * Handler for all ticket-related interactions
 */
class TicketHandler {
    /**
     * Handle button interactions for tickets
     */
    static async handleButtonInteraction(interaction, params) {
        const [action] = params;

        switch (action) {
            case "create":
                await this.showCategorySelection(interaction);
                break;

            case "close":
                await this.closeTicket(interaction);
                break;

            case "reopen":
                await this.reopenTicket(interaction);
                break;

            case "delete":
                await this.deleteTicket(interaction);
                break;

            default:
                Utils.log(`Unknown ticket button action: ${action}`, "WARN");
        }
    }

    /**
     * Handle select menu interactions for tickets
     */
    static async handleSelectMenuInteraction(interaction, params) {
        const [action] = params;

        switch (action) {
            case "category":
                await this.showTicketModal(interaction);
                break;

            default:
                Utils.log(
                    `Unknown ticket select menu action: ${action}`,
                    "WARN"
                );
        }
    }

    /**
     * Handle modal submissions for tickets
     */
    static async handleModalSubmit(interaction, params) {
        const [action, category] = params;

        switch (action) {
            case "create":
                await this.createTicket(interaction, category);
                break;

            default:
                Utils.log(`Unknown ticket modal action: ${action}`, "WARN");
        }
    }

    /**
     * Show category selection menu
     */
    static async showCategorySelection(interaction) {
        try {
            // Check if user already has too many open tickets
            const existingTickets = await Ticket.countDocuments({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                status: "open",
            });

            if (existingTickets >= config.tickets.maxTicketsPerUser) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            `You can only have ${config.tickets.maxTicketsPerUser} open tickets at a time.`
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("ticket_category")
                .setPlaceholder("Select a ticket category")
                .addOptions(
                    config.tickets.categories.map((category) => ({
                        label: category.name,
                        description: category.description,
                        value: category.name.toLowerCase().replace(/\s+/g, "_"),
                        emoji: category.emoji,
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = Utils.createInfoEmbed(
                "Please select the category that best describes your issue:",
                "Select Ticket Category"
            );

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true,
            });
        } catch (error) {
            Utils.log(
                `Error showing category selection: ${error.message}`,
                "ERROR"
            );
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to show category selection."
                    ),
                ],
                ephemeral: true,
            });
        }
    }

    /**
     * Show ticket creation modal
     */
    static async showTicketModal(interaction) {
        try {
            const category = interaction.values[0];
            const categoryName = category
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());

            const modal = new ModalBuilder()
                .setCustomId(`ticket_create_${category}`)
                .setTitle(`Create ${categoryName} Ticket`);

            const subjectInput = new TextInputBuilder()
                .setCustomId("subject")
                .setLabel("Subject")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Brief description of your issue")
                .setRequired(true)
                .setMaxLength(100);

            const descriptionInput = new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Description")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Detailed description of your issue")
                .setRequired(true)
                .setMaxLength(1000);

            const subjectRow = new ActionRowBuilder().addComponents(
                subjectInput
            );
            const descriptionRow = new ActionRowBuilder().addComponents(
                descriptionInput
            );

            modal.addComponents(subjectRow, descriptionRow);

            await interaction.showModal(modal);
        } catch (error) {
            Utils.log(`Error showing ticket modal: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to show ticket creation form."
                    ),
                ],
                ephemeral: true,
            });
        }
    }

    /**
     * Create a new ticket
     */
    static async createTicket(interaction, category) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const subject = interaction.fields.getTextInputValue("subject");
            const description =
                interaction.fields.getTextInputValue("description");
            const categoryName = category
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());

            // Get or create guild config
            let guildConfig = await GuildConfig.findOne({
                guildId: interaction.guild.id,
            });
            if (!guildConfig) {
                guildConfig = new GuildConfig({
                    guildId: interaction.guild.id,
                });
                await guildConfig.save();
            }

            // Increment ticket counter
            guildConfig.ticketConfig.ticketCounter += 1;
            await guildConfig.save();

            const ticketId = Utils.generateTicketId(
                guildConfig.ticketConfig.ticketCounter
            );

            // Find or create tickets category
            let ticketCategory = null;
            if (guildConfig.ticketConfig.ticketCategoryId) {
                ticketCategory = interaction.guild.channels.cache.get(
                    guildConfig.ticketConfig.ticketCategoryId
                );
            }

            if (!ticketCategory) {
                try {
                    ticketCategory = await interaction.guild.channels.create({
                        name: "Tickets",
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                        ],
                    });

                    guildConfig.ticketConfig.ticketCategoryId =
                        ticketCategory.id;
                    await guildConfig.save();
                } catch (error) {
                    Utils.log(
                        `Failed to create ticket category: ${error.message}`,
                        "ERROR"
                    );
                }
            }

            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: ticketId,
                type: ChannelType.GuildText,
                parent: ticketCategory?.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                        ],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    },
                ],
            });

            // Add admin permissions to ticket channel
            const adminRole = interaction.guild.roles.cache.find((role) =>
                role.permissions.has(PermissionFlagsBits.Administrator)
            );
            if (adminRole) {
                await ticketChannel.permissionOverwrites.create(adminRole.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    ManageMessages: true,
                });
            }

            // Create ticket in database
            const ticket = new Ticket({
                ticketId,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                category: categoryName,
                subject,
                status: "open",
                messages: [
                    {
                        userId: interaction.user.id,
                        username: interaction.user.tag,
                        content: description,
                        timestamp: new Date(),
                    },
                ],
            });

            await ticket.save();

            // Create ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`${config.emojis.ticket} ${ticketId}`)
                .setDescription(
                    `**Subject:** ${subject}\n` +
                        `**Category:** ${categoryName}\n` +
                        `**Created by:** ${Utils.formatUser(
                            interaction.user
                        )}\n\n` +
                        `**Description:**\n${description}`
                )
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: "Ticket created" });

            // Create control buttons
            const closeButton = new ButtonBuilder()
                .setCustomId("ticket_close")
                .setLabel("Close Ticket")
                .setEmoji(config.emojis.lock)
                .setStyle(ButtonStyle.Secondary);

            const deleteButton = new ButtonBuilder()
                .setCustomId("ticket_delete")
                .setLabel("Delete Ticket")
                .setEmoji(config.emojis.delete)
                .setStyle(ButtonStyle.Danger);

            const controlRow = new ActionRowBuilder().addComponents(
                closeButton,
                deleteButton
            );

            // Send initial message in ticket channel
            await ticketChannel.send({
                content: `${interaction.user} Staff will be with you shortly!`,
                embeds: [ticketEmbed],
                components: [controlRow],
            });

            // Confirm ticket creation
            const successEmbed = Utils.createSuccessEmbed(
                `Your ticket has been created: ${ticketChannel}`,
                "Ticket Created"
            );

            await interaction.editReply({ embeds: [successEmbed] });

            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} created ticket ${ticketId} in ${categoryName}`
            );
        } catch (error) {
            Utils.log(`Error creating ticket: ${error.message}`, "ERROR");
            await interaction.editReply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to create ticket. Please try again or contact an administrator."
                    ),
                ],
            });
        }
    }

    /**
     * Close a ticket
     */
    static async closeTicket(interaction) {
        try {
            if (!Utils.hasAdminPermissions(interaction.member)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Only administrators can close tickets."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            const ticket = await Ticket.findOne({
                channelId: interaction.channel.id,
                status: "open",
            });

            if (!ticket) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "This is not an active ticket channel."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Update ticket
            ticket.status = "closed";
            ticket.closedAt = new Date();
            ticket.closedBy = interaction.user.id;
            await ticket.save();

            // Lock channel for user
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                SendMessages: false,
            });

            // Update channel name
            await interaction.channel.setName(`closed-${ticket.ticketId}`);

            // Create closure embed
            const closureEmbed = Utils.createWarningEmbed(
                `Ticket closed by ${Utils.formatUser(interaction.user)}`,
                `${config.emojis.lock} Ticket Closed`
            );

            // Create reopen button
            const reopenButton = new ButtonBuilder()
                .setCustomId("ticket_reopen")
                .setLabel("Reopen Ticket")
                .setEmoji(config.emojis.unlock)
                .setStyle(ButtonStyle.Success);

            const deleteButton = new ButtonBuilder()
                .setCustomId("ticket_delete")
                .setLabel("Delete Ticket")
                .setEmoji(config.emojis.delete)
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(
                reopenButton,
                deleteButton
            );

            await interaction.reply({
                embeds: [closureEmbed],
                components: [row],
            });

            Utils.log(
                `${Utils.formatUser(interaction.user)} closed ticket ${
                    ticket.ticketId
                }`
            );
        } catch (error) {
            Utils.log(`Error closing ticket: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to close ticket.")],
                ephemeral: true,
            });
        }
    }

    /**
     * Reopen a ticket
     */
    static async reopenTicket(interaction) {
        try {
            if (!Utils.hasAdminPermissions(interaction.member)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Only administrators can reopen tickets."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            const ticket = await Ticket.findOne({
                channelId: interaction.channel.id,
                status: "closed",
            });

            if (!ticket) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "This is not a closed ticket channel."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Update ticket
            ticket.status = "open";
            ticket.closedAt = null;
            ticket.closedBy = null;
            await ticket.save();

            // Unlock channel for user
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                SendMessages: true,
            });

            // Update channel name
            await interaction.channel.setName(ticket.ticketId);

            // Create reopen embed
            const reopenEmbed = Utils.createSuccessEmbed(
                `Ticket reopened by ${Utils.formatUser(interaction.user)}`,
                `${config.emojis.unlock} Ticket Reopened`
            );

            await interaction.reply({ embeds: [reopenEmbed] });

            Utils.log(
                `${Utils.formatUser(interaction.user)} reopened ticket ${
                    ticket.ticketId
                }`
            );
        } catch (error) {
            Utils.log(`Error reopening ticket: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to reopen ticket.")],
                ephemeral: true,
            });
        }
    }

    /**
     * Delete a ticket
     */
    static async deleteTicket(interaction) {
        try {
            if (!Utils.hasAdminPermissions(interaction.member)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Only administrators can delete tickets."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            const ticket = await Ticket.findOne({
                channelId: interaction.channel.id,
            });

            if (!ticket) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("This is not a ticket channel."),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Update ticket status
            ticket.status = "archived";
            if (!ticket.closedAt) {
                ticket.closedAt = new Date();
                ticket.closedBy = interaction.user.id;
            }
            await ticket.save();

            // Send deletion warning
            const deleteEmbed = Utils.createWarningEmbed(
                "This ticket will be deleted in 10 seconds.",
                `${config.emojis.delete} Deleting Ticket`
            );

            await interaction.reply({ embeds: [deleteEmbed] });

            Utils.log(
                `${Utils.formatUser(interaction.user)} deleted ticket ${
                    ticket.ticketId
                }`
            );

            // Delete channel after delay
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    Utils.log(
                        `Failed to delete ticket channel: ${error.message}`,
                        "ERROR"
                    );
                }
            }, 10000);
        } catch (error) {
            Utils.log(`Error deleting ticket: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to delete ticket.")],
                ephemeral: true,
            });
        }
    }
}

module.exports = TicketHandler;
