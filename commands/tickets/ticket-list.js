const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const Ticket = require("../../models/Ticket");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-list")
        .setDescription("List all tickets")
        .addStringOption((option) =>
            option
                .setName("status")
                .setDescription("Filter by ticket status")
                .setRequired(false)
                .addChoices(
                    { name: "Open", value: "open" },
                    { name: "Closed", value: "closed" },
                    { name: "Archived", value: "archived" }
                )
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Filter by user")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const status = interaction.options.getString("status");
        const user = interaction.options.getUser("user");

        try {
            // Build query
            const query = { guildId: interaction.guild.id };
            if (status) query.status = status;
            if (user) query.userId = user.id;

            // Fetch tickets
            const tickets = await Ticket.find(query)
                .sort({ createdAt: -1 })
                .limit(20); // Limit to prevent spam

            if (tickets.length === 0) {
                await interaction.reply({
                    embeds: [
                        Utils.createInfoEmbed(
                            "No tickets found matching your criteria."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.ticket} Ticket List`)
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: `Showing ${tickets.length} tickets` });

            if (status)
                embed.setDescription(
                    `**Status Filter:** ${
                        status.charAt(0).toUpperCase() + status.slice(1)
                    }`
                );
            if (user)
                embed.setDescription(
                    (embed.data.description || "") +
                        `\n**User Filter:** ${Utils.formatUser(user)}`
                );

            // Add ticket fields
            for (const ticket of tickets.slice(0, 10)) {
                // Show max 10 tickets
                const statusEmoji =
                    {
                        open: "🟢",
                        closed: "🟡",
                        archived: "🔴",
                    }[ticket.status] || "⚪";

                let ticketUser = "Unknown User";
                try {
                    const user = await interaction.client.users.fetch(
                        ticket.userId
                    );
                    ticketUser = user.tag;
                } catch (error) {
                    // User not found
                }

                const createdDate = ticket.createdAt.toLocaleDateString();
                const channel = interaction.guild.channels.cache.get(
                    ticket.channelId
                );
                const channelText = channel
                    ? `<#${channel.id}>`
                    : "Channel Deleted";

                embed.addFields({
                    name: `${statusEmoji} ${ticket.ticketId}`,
                    value: `**User:** ${ticketUser}\n**Category:** ${ticket.category}\n**Created:** ${createdDate}\n**Channel:** ${channelText}`,
                    inline: true,
                });
            }

            if (tickets.length > 10) {
                embed.addFields({
                    name: "Note",
                    value: `Only showing the first 10 tickets. Total found: ${tickets.length}`,
                    inline: false,
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            Utils.log(`Error listing tickets: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to retrieve tickets.")],
                ephemeral: true,
            });
        }
    },
};
