/**
 * DisTrack Discord Bot - Server Management Bot
 * Main entry point for the Discord bot
 *
 * Features:
 * - Admin-only moderation commands (kick, timeout, ban)
 * - Comprehensive ticketing system
 * - Modular command structure
 * - Database integration with MongoDB
 * - Event handling and error management
 */

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const mongoose = require("mongoose");
const config = require("./config/config");
const Utils = require("./utils/Utils");
const CommandLoader = require("./utils/CommandLoader");
const CommandDeployer = require("./utils/CommandDeployer");
const EventHandler = require("./events/EventHandler");

/**
 * Main Bot Class
 */
class DisTrackBot {
    constructor() {
        // Initialize Discord client with required intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.GuildMember,
            ],
        });

        // Initialize components
        this.commandLoader = new CommandLoader(this.client);
        this.commandDeployer = new CommandDeployer();
        this.eventHandler = null;

        // Bind process handlers
        this.setupProcessHandlers();
    }

    /**
     * Initialize and start the bot
     */
    async start() {
        try {
            Utils.log("Starting DisTrack Discord Bot...", "INFO");

            // Connect to MongoDB
            await this.connectDatabase();

            // Load commands
            await this.commandLoader.loadCommands();

            // Deploy slash commands (if needed)
            await this.deployCommands();

            // Initialize event handler
            this.eventHandler = new EventHandler(this.client);

            // Login to Discord
            await this.client.login(config.token);
        } catch (error) {
            Utils.log(`Failed to start bot: ${error.message}`, "ERROR");
            console.error(error);
            process.exit(1);
        }
    }

    /**
     * Connect to MongoDB database
     */
    async connectDatabase() {
        try {
            Utils.log("Connecting to MongoDB...", "INFO");

            await mongoose.connect(config.mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            Utils.log("Successfully connected to MongoDB", "INFO");

            // Handle database events
            mongoose.connection.on("error", (error) => {
                Utils.log(`Database error: ${error.message}`, "ERROR");
            });

            mongoose.connection.on("disconnected", () => {
                Utils.log("Disconnected from MongoDB", "WARN");
            });

            mongoose.connection.on("reconnected", () => {
                Utils.log("Reconnected to MongoDB", "INFO");
            });
        } catch (error) {
            Utils.log(
                `Failed to connect to MongoDB: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Deploy slash commands to Discord
     */
    async deployCommands() {
        try {
            // Check if we're in development (deploy to guild) or production (deploy globally)
            const isDevelopment = process.env.NODE_ENV !== "production";

            if (isDevelopment && process.env.GUILD_ID) {
                // Development: Deploy to specific guild for faster updates
                Utils.log(
                    "Development mode: Deploying commands to guild...",
                    "INFO"
                );
                await this.commandDeployer.deployGuild(process.env.GUILD_ID);
            } else {
                // Production: Deploy globally
                Utils.log(
                    "Production mode: Checking if global command deployment is needed...",
                    "INFO"
                );

                const needsUpdate = await this.commandDeployer.needsUpdate();
                if (needsUpdate) {
                    Utils.log(
                        "Commands need updating, deploying globally...",
                        "INFO"
                    );
                    await this.commandDeployer.deployGlobal();
                } else {
                    Utils.log(
                        "Commands are up to date, skipping deployment",
                        "INFO"
                    );
                }
            }
        } catch (error) {
            Utils.log(
                `Warning: Failed to deploy commands: ${error.message}`,
                "WARN"
            );
            // Don't stop the bot if command deployment fails
        }
    }

    /**
     * Setup process event handlers
     */
    setupProcessHandlers() {
        // Graceful shutdown
        process.on("SIGINT", () => this.shutdown("SIGINT"));
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));

        // Handle uncaught exceptions
        process.on("uncaughtException", (error) => {
            Utils.log(`Uncaught Exception: ${error.message}`, "ERROR");
            console.error(error);
            this.shutdown("uncaughtException");
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
            Utils.log(
                `Unhandled Rejection at: ${promise}, reason: ${reason}`,
                "ERROR"
            );
            console.error(reason);
        });
    }

    /**
     * Gracefully shutdown the bot
     */
    async shutdown(signal) {
        Utils.log(`Received ${signal}, shutting down gracefully...`, "INFO");

        try {
            // Close Discord connection
            if (this.client) {
                await this.client.destroy();
                Utils.log("Discord connection closed", "INFO");
            }

            // Close database connection
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.close();
                Utils.log("Database connection closed", "INFO");
            }
        } catch (error) {
            Utils.log(`Error during shutdown: ${error.message}`, "ERROR");
        }

        Utils.log("Bot shutdown complete", "INFO");
        process.exit(0);
    }

    /**
     * Restart the bot (useful for development)
     */
    async restart() {
        Utils.log("Restarting bot...", "INFO");

        try {
            // Reload commands
            await this.commandLoader.reloadCommands();

            // Redeploy commands if needed
            await this.deployCommands();

            Utils.log("Bot restarted successfully", "INFO");
        } catch (error) {
            Utils.log(`Failed to restart bot: ${error.message}`, "ERROR");
        }
    }

    /**
     * Get bot statistics
     */
    getStats() {
        return {
            guilds: this.client.guilds.cache.size,
            users: this.client.users.cache.size,
            channels: this.client.channels.cache.size,
            commands: this.client.commands.size,
            uptime: Utils.formatDuration(this.client.uptime),
            ping: this.client.ws.ping,
            memoryUsage: process.memoryUsage(),
            version: require("./package.json").version || "0.0.1",
        };
    }
}

// Create and start the bot
const bot = new DisTrackBot();

// Start the bot
bot.start().catch((error) => {
    Utils.log(`Failed to start bot: ${error.message}`, "ERROR");
    console.error(error);
    process.exit(1);
});

// Export for potential external use
module.exports = DisTrackBot;
