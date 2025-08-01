const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");
const Utils = require("../../utils/Utils");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-panel")
        .setDescription("Create a ticket panel for users to create tickets")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription(
                    "Channel to send the ticket panel to (defaults to current channel)"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const targetChannel =
            interaction.options.getChannel("channel") || interaction.channel;

        try {
            // Create the ticket panel embed
            const panelEmbed = new EmbedBuilder()
                .setTitle(`${config.emojis.ticket} DisTrack Support Tickets`)
                .setDescription(
                    "**Need help or have a question?**\n\n" +
                        "Click the button below to create a support ticket. Our staff team will assist you as soon as possible.\n\n" +
                        "**Available Categories:**\n" +
                        config.tickets.categories
                            .map(
                                (cat) =>
                                    `${cat.emoji} **${cat.name}** - ${cat.description}`
                            )
                            .join("\n")
                )
                .setColor(config.colors.primary)
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({
                    text: 'Click "Create Ticket" to get started',
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Create the button to open ticket creation
            const ticketButton = new ButtonBuilder()
                .setCustomId("ticket_create")
                .setLabel("Create Ticket")
                .setEmoji(config.emojis.ticket)
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(ticketButton);

            // Send the panel
            await targetChannel.send({
                embeds: [panelEmbed],
                components: [row],
            });

            // Confirm to the admin
            const successEmbed = Utils.createSuccessEmbed(
                `Ticket panel has been created in ${targetChannel}`,
                "Ticket Panel Created"
            );

            await interaction.reply({
                embeds: [successEmbed],
                ephemeral: true,
            });

            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} created a ticket panel in ${targetChannel.name}`
            );
        } catch (error) {
            Utils.log(`Error creating ticket panel: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to create ticket panel. Please check my permissions."
                    ),
                ],
                ephemeral: true,
            });
        }
    },
};
