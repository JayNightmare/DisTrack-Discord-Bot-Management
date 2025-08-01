const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");
const Utils = require("../utils/Utils");

/**
 * Command loader for dynamically loading all command files
 */
class CommandLoader {
    constructor(client) {
        this.client = client;
        this.client.commands = new Collection();
    }

    /**
     * Load all commands from the commands directory
     */
    async loadCommands() {
        const commandsPath = path.join(__dirname, "..", "commands");

        try {
            await this.loadCommandsFromDirectory(commandsPath);
            Utils.log(
                `Loaded ${this.client.commands.size} commands successfully`
            );
        } catch (error) {
            Utils.log(`Error loading commands: ${error.message}`, "ERROR");
            throw error;
        }
    }

    /**
     * Recursively load commands from directories
     */
    async loadCommandsFromDirectory(dirPath, category = "") {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // Recursively load commands from subdirectories
                const subCategory = category
                    ? `${category}/${entry.name}`
                    : entry.name;
                await this.loadCommandsFromDirectory(fullPath, subCategory);
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                await this.loadCommand(fullPath, category);
            }
        }
    }

    /**
     * Load a single command file
     */
    async loadCommand(filePath, category) {
        try {
            // Clear require cache to allow hot reloading
            delete require.cache[require.resolve(filePath)];

            const command = require(filePath);

            // Validate command structure
            if (!command.data || !command.execute) {
                Utils.log(`Invalid command structure in ${filePath}`, "WARN");
                return;
            }

            // Add category information
            command.category = category || "general";

            // Add command to collection
            this.client.commands.set(command.data.name, command);

            Utils.log(
                `Loaded command: ${command.data.name}${
                    category ? ` (${category})` : ""
                }`
            );
        } catch (error) {
            Utils.log(
                `Failed to load command ${filePath}: ${error.message}`,
                "ERROR"
            );
        }
    }

    /**
     * Reload all commands (useful for development)
     */
    async reloadCommands() {
        this.client.commands.clear();
        await this.loadCommands();
    }

    /**
     * Reload a specific command
     */
    async reloadCommand(commandName) {
        const command = this.client.commands.get(commandName);
        if (!command) {
            throw new Error(`Command ${commandName} not found`);
        }

        // Find the command file path
        const commandsPath = path.join(__dirname, "..", "commands");
        const commandFile = await this.findCommandFile(
            commandsPath,
            commandName
        );

        if (!commandFile) {
            throw new Error(`Command file for ${commandName} not found`);
        }

        // Reload the command
        await this.loadCommand(commandFile.path, commandFile.category);
        Utils.log(`Reloaded command: ${commandName}`);
    }

    /**
     * Find a specific command file
     */
    async findCommandFile(dirPath, commandName, category = "") {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                const subCategory = category
                    ? `${category}/${entry.name}`
                    : entry.name;
                const result = await this.findCommandFile(
                    fullPath,
                    commandName,
                    subCategory
                );
                if (result) return result;
            } else if (
                entry.isFile() &&
                entry.name.endsWith(".js") &&
                entry.name === `${commandName}.js`
            ) {
                return { path: fullPath, category };
            }
        }

        return null;
    }

    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        return this.client.commands.filter(
            (command) => command.category === category
        );
    }

    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set();
        this.client.commands.forEach((command) => {
            if (command.category) {
                categories.add(command.category);
            }
        });
        return Array.from(categories);
    }

    /**
     * Get admin-only commands
     */
    getAdminCommands() {
        return this.client.commands.filter(
            (command) => command.adminOnly === true
        );
    }

    /**
     * Get public commands
     */
    getPublicCommands() {
        return this.client.commands.filter(
            (command) => command.adminOnly !== true
        );
    }
}

module.exports = CommandLoader;
