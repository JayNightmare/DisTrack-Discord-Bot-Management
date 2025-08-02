const { EmbedBuilder } = require("discord.js");
const config = require("../config/config");

/**
 * Utility functions for the Discord bot
 */
class Utils {
    /**
     * Check if a user has administrator permissions
     * @param {GuildMember} member - The guild member to check
     * @returns {boolean} - Whether the user has admin permissions
     */
    static hasAdminPermissions(member) {
        return (
            member.permissions.has("Administrator") ||
            member.user.id === config.ownerId
        );
    }

    /**
     * Create a standardized embed
     * @param {Object} options - Embed options
     * @returns {EmbedBuilder} - The created embed
     */
    static createEmbed(options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || config.colors.primary)
            .setTimestamp();

        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.author) embed.setAuthor(options.author);
        if (options.footer) embed.setFooter(options.footer);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.fields) embed.addFields(options.fields);

        return embed;
    }

    /**
     * Create a success embed
     * @param {string} description - The description text
     * @param {string} title - Optional title
     * @returns {EmbedBuilder} - Success embed
     */
    static createSuccessEmbed(description, title = null) {
        return this.createEmbed({
            title: title || `${config.emojis.success} Success`,
            description,
            color: config.colors.success,
        });
    }

    /**
     * Create an error embed
     * @param {string} description - The description text
     * @param {string} title - Optional title
     * @returns {EmbedBuilder} - Error embed
     */
    static createErrorEmbed(description, title = null) {
        return this.createEmbed({
            title: title || `${config.emojis.error} Error`,
            description,
            color: config.colors.error,
        });
    }

    /**
     * Create a warning embed
     * @param {string} description - The description text
     * @param {string} title - Optional title
     * @returns {EmbedBuilder} - Warning embed
     */
    static createWarningEmbed(description, title = null) {
        return this.createEmbed({
            title: title || `${config.emojis.warning} Warning`,
            description,
            color: config.colors.warning,
        });
    }

    /**
     * Create an info embed
     * @param {string} description - The description text
     * @param {string} title - Optional title
     * @returns {EmbedBuilder} - Info embed
     */
    static createInfoEmbed(description, title = null) {
        return this.createEmbed({
            title: title || `${config.emojis.info} Information`,
            description,
            color: config.colors.info,
        });
    }

    /**
     * Format a user mention with tag
     * @param {User} user - The Discord user
     * @returns {string} - Formatted user string
     */
    static formatUser(user) {
        return `${user.tag} (${user.id})`;
    }

    /**
     * Format a duration from milliseconds
     * @param {number} ms - Milliseconds
     * @returns {string} - Formatted duration
     */
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Parse duration string to milliseconds
     * @param {string} duration - Duration string (e.g., "1h", "30m", "1d", "6m" for months, "1y" for years)
     * @returns {number|null} - Milliseconds or null if invalid
     */
    static parseDuration(duration) {
        const regex = /^(\d+)([smhdMy])$/i;
        const match = duration.match(regex);

        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case "s":
                return value * 1000;
            case "m":
                return value * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "d":
                return value * 24 * 60 * 60 * 1000;
            case "m": // months (uppercase M in regex, but toLowerCase makes it 'm' - handle both)
                return value * 30 * 24 * 60 * 60 * 1000; // Approximate month
            case "y":
                return value * 365 * 24 * 60 * 60 * 1000; // Approximate year
            default:
                return null;
        }
    }

    /**
     * Parse extended duration string to milliseconds (supports months and years)
     * @param {string} duration - Duration string (e.g., "1h", "30m", "1d", "6M", "1y")
     * @returns {number|null} - Milliseconds or null if invalid
     */
    static parseExtendedDuration(duration) {
        const regex = /^(\d+)([smhdMy])$/;
        const match = duration.match(regex);

        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case "s":
                return value * 1000;
            case "m":
                return value * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "d":
                return value * 24 * 60 * 60 * 1000;
            case "M": // months (uppercase)
                return value * 30 * 24 * 60 * 60 * 1000;
            case "y":
                return value * 365 * 24 * 60 * 60 * 1000;
            default:
                return null;
        }
    }

    /**
     * Validate duration for timeout (Discord limits)
     * @param {number} ms - Duration in milliseconds
     * @returns {boolean} - Whether duration is valid
     */
    static isValidTimeoutDuration(ms) {
        const maxMs = 28 * 24 * 60 * 60 * 1000; // 28 days in milliseconds
        return ms > 0 && ms <= maxMs;
    }

    /**
     * Generate a unique ticket ID
     * @param {number} counter - Ticket counter
     * @returns {string} - Unique ticket ID
     */
    static generateTicketId(counter) {
        return `ticket-${String(counter).padStart(4, "0")}`;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @returns {string} - Truncated text
     */
    static truncateText(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length - 3) + "...";
    }

    /**
     * Log to console with timestamp
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    static log(message, level = "INFO") {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    /**
     * Validate user permissions for command execution
     * @param {CommandInteraction} interaction - The command interaction
     * @returns {boolean} - Whether user can execute admin commands
     */
    static async validateAdminPermissions(interaction) {
        if (!interaction.member) {
            await interaction.reply({
                embeds: [
                    this.createErrorEmbed(
                        "This command can only be used in a server."
                    ),
                ],
                ephemeral: true,
            });
            return false;
        }

        if (!this.hasAdminPermissions(interaction.member)) {
            await interaction.reply({
                embeds: [
                    this.createErrorEmbed(
                        "You need Administrator permissions to use this command."
                    ),
                ],
                ephemeral: true,
            });
            return false;
        }

        return true;
    }
}

module.exports = Utils;
