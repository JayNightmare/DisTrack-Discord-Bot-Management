const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");
const Ticket = require("../../models/Ticket");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-delete")
        .setDescription("Delete the current ticket channel")
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for deleting the ticket")
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

            // Update ticket status to archived
            ticket.status = "archived";
            if (!ticket.closedAt) {
                ticket.closedAt = new Date();
                ticket.closedBy = interaction.user.id;
            }
            await ticket.save();

            // Send confirmation before deleting
            const confirmEmbed = Utils.createWarningEmbed(
                `This ticket channel will be deleted in 10 seconds.\n**Reason:** ${reason}`,
                `${config.emojis.delete} Deleting Ticket`
            );

            await interaction.reply({ embeds: [confirmEmbed] });

            // DM the ticket creator before deletion
            try {
                const user = await interaction.client.users.fetch(
                    ticket.userId
                );
                const dmEmbed = Utils.createWarningEmbed(
                    `Your ticket **${ticket.ticketId}** in **${interaction.guild.name}** has been deleted.\n**Reason:** ${reason}`,
                    "Ticket Deleted"
                );
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                Utils.log(
                    `Could not DM ticket creator about deletion: ${error.message}`,
                    "WARN"
                );
            }

            Utils.log(
                `${Utils.formatUser(interaction.user)} deleted ticket ${
                    ticket.ticketId
                }: ${reason}`
            );

            // Delete the channel after delay
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
                embeds: [
                    Utils.createErrorEmbed("Failed to delete the ticket."),
                ],
                ephemeral: true,
            });
        }
    },
};
