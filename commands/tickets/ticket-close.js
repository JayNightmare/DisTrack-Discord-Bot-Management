const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");
const Ticket = require("../../models/Ticket");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-close")
        .setDescription("Close the current ticket")
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for closing the ticket")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            // Check if this is a ticket channel
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

            // Update ticket in database
            ticket.status = "closed";
            ticket.closedAt = new Date();
            ticket.closedBy = interaction.user.id;
            await ticket.save();

            // Lock the channel
            await interaction.channel.permissionOverwrites.edit(ticket.userId, {
                SendMessages: false,
                ViewChannel: true,
            });

            // Create closure embed
            const closureEmbed = Utils.createWarningEmbed(
                `**Ticket:** ${
                    ticket.ticketId
                }\n**Closed by:** ${Utils.formatUser(
                    interaction.user
                )}\n**Reason:** ${reason}\n\nThis ticket has been closed. Use \`/ticket-reopen\` to reopen if needed.`,
                `${config.emojis.lock} Ticket Closed`
            );

            await interaction.reply({ embeds: [closureEmbed] });

            // Update channel name
            try {
                await interaction.channel.setName(`closed-${ticket.ticketId}`);
            } catch (error) {
                Utils.log(
                    `Could not rename closed ticket channel: ${error.message}`,
                    "WARN"
                );
            }

            // DM the ticket creator
            try {
                const user = await interaction.client.users.fetch(
                    ticket.userId
                );
                const dmEmbed = Utils.createInfoEmbed(
                    `Your ticket **${ticket.ticketId}** in **${interaction.guild.name}** has been closed.\n**Reason:** ${reason}`,
                    "Ticket Closed"
                );
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                Utils.log(
                    `Could not DM ticket creator about closure: ${error.message}`,
                    "WARN"
                );
            }

            Utils.log(
                `${Utils.formatUser(interaction.user)} closed ticket ${
                    ticket.ticketId
                }: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error closing ticket: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to close the ticket.")],
                ephemeral: true,
            });
        }
    },
};
