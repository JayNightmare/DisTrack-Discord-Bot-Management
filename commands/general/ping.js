const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Utils = require("../../utils/Utils");
const config = require("../../config/config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency and status"),

    adminOnly: false,

    async execute(interaction) {
        try {
            const sent = await interaction.reply({
                content: "🏓 Pinging...",
                fetchReply: true,
                ephemeral: true,
            });

            const roundtripLatency =
                sent.createdTimestamp - interaction.createdTimestamp;
            const wsLatency = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
                .setTitle("🏓 Pong!")
                .setColor(config.colors.success)
                .addFields(
                    {
                        name: "Roundtrip Latency",
                        value: `${roundtripLatency}ms`,
                        inline: true,
                    },
                    {
                        name: "WebSocket Latency",
                        value: `${wsLatency}ms`,
                        inline: true,
                    },
                    {
                        name: "Status",
                        value: "✅ Online",
                        inline: true,
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `Bot: ${interaction.client.user.tag}`,
                    iconURL: interaction.client.user.displayAvatarURL(),
                });

            // Add latency status indicator
            if (roundtripLatency > 1000 || wsLatency > 500) {
                embed.setColor(config.colors.error);
                embed.addFields({
                    name: "⚠️ High Latency Warning",
                    value: "The bot may be experiencing performance issues.",
                    inline: false,
                });
            } else if (roundtripLatency > 500 || wsLatency > 250) {
                embed.setColor(config.colors.warning);
            }

            await interaction.editReply({
                content: null,
                embeds: [embed],
            });
        } catch (error) {
            Utils.log(`Error in ping command: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [Utils.createErrorEmbed("Failed to check bot status.")],
                ephemeral: true,
            });
        }
    },
};
