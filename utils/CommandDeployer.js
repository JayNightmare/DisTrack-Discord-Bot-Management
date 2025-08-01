const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const Utils = require("../utils/Utils");
const config = require("../config/config");

/**
 * Deploy slash commands to Discord
 */
class CommandDeployer {
    constructor() {
        this.rest = new REST({ version: "10" }).setToken(config.token);
        this.commands = [];
    }

    /**
     * Load all command data from files
     */
    async loadCommandData() {
        this.commands = [];
        const commandsPath = path.join(__dirname, "..", "commands");

        await this.loadCommandsFromDirectory(commandsPath);
        Utils.log(`Loaded ${this.commands.length} commands for deployment`);
    }

    /**
     * Recursively load commands from directories
     */
    async loadCommandsFromDirectory(dirPath) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await this.loadCommandsFromDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                await this.loadCommandFromFile(fullPath);
            }
        }
    }

    /**
     * Load command from a single file
     */
    async loadCommandFromFile(filePath) {
        try {
            const command = require(filePath);

            if (command.data && command.execute) {
                this.commands.push(command.data.toJSON());
                Utils.log(`Loaded command data for: ${command.data.name}`);
            } else {
                Utils.log(`Invalid command structure in ${filePath}`, "WARN");
            }
        } catch (error) {
            Utils.log(
                `Failed to load command from ${filePath}: ${error.message}`,
                "ERROR"
            );
        }
    }

    /**
     * Deploy commands globally
     */
    async deployGlobal() {
        try {
            await this.loadCommandData();

            Utils.log(
                "Started refreshing application (/) commands globally..."
            );

            const data = await this.rest.put(
                Routes.applicationCommands(config.clientId),
                { body: this.commands }
            );

            Utils.log(
                `Successfully reloaded ${data.length} application (/) commands globally`
            );
            return data;
        } catch (error) {
            Utils.log(
                `Error deploying commands globally: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Deploy commands to a specific guild (faster for testing)
     */
    async deployGuild(guildId) {
        try {
            await this.loadCommandData();

            Utils.log(
                `Started refreshing application (/) commands for guild ${guildId}...`
            );

            const data = await this.rest.put(
                Routes.applicationGuildCommands(config.clientId, guildId),
                { body: this.commands }
            );

            Utils.log(
                `Successfully reloaded ${data.length} application (/) commands for guild ${guildId}`
            );
            return data;
        } catch (error) {
            Utils.log(
                `Error deploying commands to guild ${guildId}: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Delete all global commands
     */
    async deleteGlobalCommands() {
        try {
            Utils.log("Deleting all global application (/) commands...");

            const data = await this.rest.put(
                Routes.applicationCommands(config.clientId),
                { body: [] }
            );

            Utils.log(
                "Successfully deleted all global application (/) commands"
            );
            return data;
        } catch (error) {
            Utils.log(
                `Error deleting global commands: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Delete all guild commands
     */
    async deleteGuildCommands(guildId) {
        try {
            Utils.log(
                `Deleting all application (/) commands for guild ${guildId}...`
            );

            const data = await this.rest.put(
                Routes.applicationGuildCommands(config.clientId, guildId),
                { body: [] }
            );

            Utils.log(
                `Successfully deleted all application (/) commands for guild ${guildId}`
            );
            return data;
        } catch (error) {
            Utils.log(
                `Error deleting guild commands for ${guildId}: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Get deployed commands
     */
    async getDeployedCommands(guildId = null) {
        try {
            const route = guildId
                ? Routes.applicationGuildCommands(config.clientId, guildId)
                : Routes.applicationCommands(config.clientId);

            const commands = await this.rest.get(route);

            Utils.log(
                `Retrieved ${commands.length} deployed commands${
                    guildId ? ` for guild ${guildId}` : " globally"
                }`
            );
            return commands;
        } catch (error) {
            Utils.log(
                `Error retrieving deployed commands: ${error.message}`,
                "ERROR"
            );
            throw error;
        }
    }

    /**
     * Check if commands need updating
     */
    async needsUpdate(guildId = null) {
        try {
            await this.loadCommandData();
            const deployedCommands = await this.getDeployedCommands(guildId);

            // Simple check - compare counts and names
            if (deployedCommands.length !== this.commands.length) {
                return true;
            }

            const deployedNames = deployedCommands
                .map((cmd) => cmd.name)
                .sort();
            const localNames = this.commands.map((cmd) => cmd.name).sort();

            return JSON.stringify(deployedNames) !== JSON.stringify(localNames);
        } catch (error) {
            Utils.log(
                `Error checking if commands need update: ${error.message}`,
                "ERROR"
            );
            return true; // Assume update needed if we can't check
        }
    }
}

module.exports = CommandDeployer;
