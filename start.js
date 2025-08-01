#!/usr/bin/env node

/**
 * Development startup script for DisTrack Bot
 * Includes automatic command deployment and environment checks
 */

const fs = require("fs");
const path = require("path");
const Utils = require("./utils/Utils");

async function startBot() {
    try {
        Utils.log("Starting DisTrack Bot in development mode...", "INFO");

        // Check if .env file exists
        if (!fs.existsSync(".env")) {
            console.error(
                "❌ .env file not found! Please create one with your bot credentials."
            );
            process.exit(1);
        }

        // Load environment variables
        require("dotenv").config();

        // Check required environment variables
        const required = ["TOKEN", "DISCORD_CLIENT_ID", "MONGODB_URI"];
        const missing = required.filter((key) => !process.env[key]);

        if (missing.length > 0) {
            console.error(
                `❌ Missing required environment variables: ${missing.join(
                    ", "
                )}`
            );
            process.exit(1);
        }

        // Check if MongoDB URI is valid format
        if (!process.env.MONGODB_URI.startsWith("mongodb")) {
            console.error("❌ Invalid MongoDB URI format");
            process.exit(1);
        }

        Utils.log("✅ Environment variables validated", "INFO");

        // Deploy commands if in development
        if (process.env.NODE_ENV !== "production") {
            try {
                const CommandDeployer = require("./utils/CommandDeployer");
                const deployer = new CommandDeployer();

                if (process.env.GUILD_ID) {
                    Utils.log(
                        `Deploying commands to guild ${process.env.GUILD_ID}...`,
                        "INFO"
                    );
                    await deployer.deployGuild(process.env.GUILD_ID);
                } else {
                    Utils.log(
                        "No GUILD_ID set, skipping command deployment",
                        "WARN"
                    );
                    Utils.log(
                        "Add GUILD_ID to .env for faster command deployment during development",
                        "INFO"
                    );
                }
            } catch (error) {
                Utils.log(
                    `Command deployment failed: ${error.message}`,
                    "WARN"
                );
            }
        }

        // Start the bot
        const DisTrackBot = require("./bot");
    } catch (error) {
        Utils.log(`Failed to start bot: ${error.message}`, "ERROR");
        console.error(error);
        process.exit(1);
    }
}

// Add helpful startup banner
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      DisTrack Discord Bot                     ║
║                   Server Management System                    ║
║                                                              ║
║  Features:                                                   ║
║  • Admin-only moderation (kick, timeout, ban)              ║
║  • Advanced ticketing system                               ║
║  • Database persistence                                     ║
║  • Modular architecture                                     ║
║                                                              ║
║  Documentation: README.md                                   ║
║  Commands: /help                                            ║
╚══════════════════════════════════════════════════════════════╝
`);

startBot();
