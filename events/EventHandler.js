/**
 * Event handler for the Discord bot
 * Manages all bot events and interactions
 */

const { Events } = require("discord.js");
const Utils = require("../utils/Utils");

class EventHandler {
    constructor(client) {
        this.client = client;
        this.registerEvents();
    }

    registerEvents() {
        // Bot ready event
        this.client.once(Events.ClientReady, this.onReady.bind(this));

        // Interaction events
        this.client.on(
            Events.InteractionCreate,
            this.onInteractionCreate.bind(this)
        );

        // Guild events
        this.client.on(Events.GuildCreate, this.onGuildJoin.bind(this));
        this.client.on(Events.GuildDelete, this.onGuildLeave.bind(this));

        // Error handling
        this.client.on(Events.Error, this.onError.bind(this));
        this.client.on(Events.Warn, this.onWarn.bind(this));

        // Process error handling
        process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
        process.on("uncaughtException", this.onUncaughtException.bind(this));
    }

    onReady() {
        Utils.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        Utils.log(`Bot is in ${this.client.guilds.cache.size} servers`);

        // Set bot presence
        this.client.user.setPresence({
            status: "online",
            activities: [
                {
                    name: "Managing DisTrack Server | /help",
                    type: 3, // WATCHING
                },
            ],
        });
    }

    async onInteractionCreate(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButtonInteraction(interaction);
            } else if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenuInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            }
        } catch (error) {
            Utils.log(`Error handling interaction: ${error.message}`, "ERROR");
            console.error(error);

            const errorEmbed = Utils.createErrorEmbed(
                "An error occurred while processing your request."
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }
        }
    }

    async handleSlashCommand(interaction) {
        const command = this.client.commands.get(interaction.commandName);

        if (!command) {
            Utils.log(`Unknown command: ${interaction.commandName}`, "WARN");
            return;
        }

        // Check if command requires admin permissions
        if (command.adminOnly) {
            if (!Utils.hasAdminPermissions(interaction.member)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "You need Administrator permissions to use this command."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }
        }

        Utils.log(
            `${Utils.formatUser(interaction.user)} used /${
                interaction.commandName
            } in ${interaction.guild?.name || "DM"}`
        );

        await command.execute(interaction);
    }

    async handleButtonInteraction(interaction) {
        const [action, ...params] = interaction.customId.split("_");

        switch (action) {
            case "ticket":
                const ticketHandler = require("../handlers/TicketHandler");
                await ticketHandler.handleButtonInteraction(
                    interaction,
                    params
                );
                break;

            case "confirm":
                // Handle confirmation dialogs
                await this.handleConfirmation(interaction, params);
                break;

            default:
                Utils.log(
                    `Unknown button interaction: ${interaction.customId}`,
                    "WARN"
                );
        }
    }

    async handleSelectMenuInteraction(interaction) {
        const [action, ...params] = interaction.customId.split("_");

        switch (action) {
            case "ticket":
                const ticketHandler = require("../handlers/TicketHandler");
                await ticketHandler.handleSelectMenuInteraction(
                    interaction,
                    params
                );
                break;

            default:
                Utils.log(
                    `Unknown select menu interaction: ${interaction.customId}`,
                    "WARN"
                );
        }
    }

    async handleModalSubmit(interaction) {
        const [action, ...params] = interaction.customId.split("_");

        switch (action) {
            case "ticket":
                const ticketHandler = require("../handlers/TicketHandler");
                await ticketHandler.handleModalSubmit(interaction, params);
                break;

            default:
                Utils.log(
                    `Unknown modal submit: ${interaction.customId}`,
                    "WARN"
                );
        }
    }

    async handleConfirmation(interaction, params) {
        // Handle confirmation button interactions for dangerous operations
        const [type, targetId] = params;

        if (!Utils.hasAdminPermissions(interaction.member)) {
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "You do not have permission to perform this action."
                    ),
                ],
                ephemeral: true,
            });
            return;
        }

        // Process confirmation based on type
        // This would handle confirmations for bans, kicks, etc.
        Utils.log(`Confirmation interaction: ${type} for ${targetId}`, "INFO");
    }

    onGuildJoin(guild) {
        Utils.log(`Joined guild: ${guild.name} (${guild.id})`, "INFO");
    }

    onGuildLeave(guild) {
        Utils.log(`Left guild: ${guild.name} (${guild.id})`, "INFO");
    }

    onError(error) {
        Utils.log(`Discord client error: ${error.message}`, "ERROR");
        console.error(error);
    }

    onWarn(warning) {
        Utils.log(`Discord client warning: ${warning}`, "WARN");
    }

    onUnhandledRejection(reason, promise) {
        Utils.log(
            `Unhandled Rejection at: ${promise}, reason: ${reason}`,
            "ERROR"
        );
        console.error(reason);
    }

    onUncaughtException(error) {
        Utils.log(`Uncaught Exception: ${error.message}`, "ERROR");
        console.error(error);
        process.exit(1);
    }
}

module.exports = EventHandler;
