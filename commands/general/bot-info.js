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
        .setName("bot-info")
        .setDescription("Show bot information and statistics")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        try {
            // Get bot statistics
            const guilds = interaction.client.guilds.cache.size;
            const users = interaction.client.users.cache.size;
            const channels = interaction.client.channels.cache.size;
            const commands = interaction.client.commands.size;
            const uptime = Utils.formatDuration(interaction.client.uptime);
            const ping = interaction.client.ws.ping;

            // Get memory usage
            const memUsage = process.memoryUsage();
            const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
            const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);

            // Get ticket statistics for this guild
            const openTickets = await Ticket.countDocuments({
                guildId: interaction.guild.id,
                status: "open",
            });
            const closedTickets = await Ticket.countDocuments({
                guildId: interaction.guild.id,
                status: "closed",
            });
            const totalTickets = await Ticket.countDocuments({
                guildId: interaction.guild.id,
            });

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.info} DisTrack Bot Information`)
                .setColor(config.colors.primary)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    {
                        name: "🤖 Bot Statistics",
                        value: `**Guilds:** ${guilds}\n**Users:** ${users}\n**Channels:** ${channels}\n**Commands:** ${commands}`,
                        inline: true,
                    },
                    {
                        name: "⚡ Performance",
                        value: `**Uptime:** ${uptime}\n**Ping:** ${ping}ms\n**Memory:** ${memUsed}/${memTotal} MB`,
                        inline: true,
                    },
                    {
                        name: "🎫 Ticket Statistics (This Server)",
                        value: `**Open:** ${openTickets}\n**Closed:** ${closedTickets}\n**Total:** ${totalTickets}`,
                        inline: true,
                    },
                    {
                        name: "📋 Features",
                        value:
                            "• Admin-only moderation commands\n" +
                            "• Advanced ticketing system\n" +
                            "• Database persistence\n" +
                            "• Comprehensive logging\n" +
                            "• Error handling & recovery",
                        inline: false,
                    },
                    {
                        name: "🔧 System Information",
                        value:
                            `**Node.js:** ${process.version}\n` +
                            `**Discord.js:** v14\n` +
                            `**Database:** MongoDB\n` +
                            `**Environment:** ${
                                process.env.NODE_ENV || "development"
                            }`,
                        inline: false,
                    }
                )
                .setFooter({
                    text: `Bot ID: ${interaction.client.user.id} | Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            Utils.log(`Error in bot-info command: ${error.message}`, "ERROR");
            await interaction.reply({
                embeds: [
                    Utils.createErrorEmbed(
                        "Failed to retrieve bot information."
                    ),
                ],
                ephemeral: true,
            });
        }
    },
};
