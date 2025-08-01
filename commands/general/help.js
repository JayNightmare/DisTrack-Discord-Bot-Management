const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show bot commands and information")
        .addStringOption((option) =>
            option
                .setName("category")
                .setDescription("Show commands for a specific category")
                .setRequired(false)
                .addChoices(
                    { name: "Moderation", value: "moderation" },
                    { name: "Tickets", value: "tickets" },
                    { name: "General", value: "general" }
                )
        ),

    adminOnly: false, // Help command is available to everyone

    async execute(interaction) {
        const category = interaction.options.getString("category");

        try {
            if (category) {
                await this.showCategoryHelp(interaction, category);
            } else {
                await this.showGeneralHelp(interaction);
            }
        } catch (error) {
            Utils.log(`Error showing help: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed("Failed to show help information."),
                ],
                ephemeral: true,
            });
        }
    },

    async showGeneralHelp(interaction) {
        const isAdmin = Utils.hasAdminPermissions(interaction.member);

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.info} DisTrack Bot Help`)
            .setDescription(
                "Welcome to the DisTrack server management bot!\n\n" +
                    (isAdmin
                        ? "**You have administrator permissions** - You can use all commands.\n\n"
                        : "**Note:** Most commands require administrator permissions.\n\n") +
                    "**Available Categories:**\n" +
                    "`/help category:general` - General commands\n" +
                    (isAdmin
                        ? "`/help category:moderation` - Moderation commands\n"
                        : "") +
                    (isAdmin
                        ? "`/help category:tickets` - Ticket system commands\n"
                        : "") +
                    "\n**Ticket System:**\n" +
                    "Users can create support tickets using the ticket panel.\n" +
                    "Staff will be notified and can assist accordingly."
            )
            .setColor(config.colors.primary)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({
                text: "Use /help category:<name> for detailed command info",
                iconURL: interaction.guild.iconURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showCategoryHelp(interaction, category) {
        const isAdmin = Utils.hasAdminPermissions(interaction.member);

        let embed;

        switch (category) {
            case "moderation":
                if (!isAdmin) {
                    await interaction.reply({
                        embeds: [
                            Utils.createErrorEmbed(
                                "You need administrator permissions to view moderation commands."
                            ),
                        ],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle("🛡️ Moderation Commands")
                    .setDescription(
                        "Commands for server moderation (Admin only)"
                    )
                    .setColor(config.colors.warning)
                    .addFields(
                        {
                            name: "/kick",
                            value: "Kick a member from the server\n**Usage:** `/kick user:<@user> reason:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/timeout",
                            value: "Timeout a member for a specified duration\n**Usage:** `/timeout user:<@user> duration:<10m/1h/1d> reason:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/remove-timeout",
                            value: "Remove timeout from a member\n**Usage:** `/remove-timeout user:<@user> reason:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/ban",
                            value: "Ban a member from the server\n**Usage:** `/ban user:<@user> reason:<optional> delete_days:<0-7>`",
                            inline: false,
                        },
                        {
                            name: "/unban",
                            value: "Unban a user from the server\n**Usage:** `/unban user_id:<user_id> reason:<optional>`",
                            inline: false,
                        }
                    )
                    .setTimestamp();
                break;

            case "tickets":
                if (!isAdmin) {
                    await interaction.reply({
                        embeds: [
                            Utils.createErrorEmbed(
                                "You need administrator permissions to view ticket management commands."
                            ),
                        ],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle("🎫 Ticket Commands")
                    .setDescription(
                        "Commands for managing the ticket system (Admin only)"
                    )
                    .setColor(config.colors.info)
                    .addFields(
                        {
                            name: "/ticket-panel",
                            value: "Create a ticket panel for users to create tickets\n**Usage:** `/ticket-panel channel:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/ticket-close",
                            value: "Close the current ticket\n**Usage:** `/ticket-close reason:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/ticket-delete",
                            value: "Delete the current ticket channel\n**Usage:** `/ticket-delete reason:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/ticket-list",
                            value: "List all tickets with optional filters\n**Usage:** `/ticket-list status:<optional> user:<optional>`",
                            inline: false,
                        },
                        {
                            name: "Creating Tickets",
                            value: 'Users can create tickets by clicking the "Create Ticket" button on the ticket panel. They can choose from different categories and provide details about their issue.',
                            inline: false,
                        }
                    )
                    .setTimestamp();
                break;

            case "general":
                embed = new EmbedBuilder()
                    .setTitle("📋 General Commands")
                    .setDescription(
                        "General bot commands available to everyone"
                    )
                    .setColor(config.colors.primary)
                    .addFields(
                        {
                            name: "/help",
                            value: "Show this help information\n**Usage:** `/help category:<optional>`",
                            inline: false,
                        },
                        {
                            name: "/ping",
                            value: "Check bot latency and status\n**Usage:** `/ping`",
                            inline: false,
                        },
                        {
                            name: "Ticket Creation",
                            value: "Create support tickets using the ticket panel (if set up by administrators)",
                            inline: false,
                        }
                    )
                    .setTimestamp();
                break;

            default:
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed("Unknown help category.")],
                    ephemeral: true,
                });
                return;
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
