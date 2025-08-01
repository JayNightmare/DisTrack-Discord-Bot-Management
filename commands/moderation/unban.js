const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user from the server")
        .addStringOption((option) =>
            option
                .setName("user_id")
                .setDescription("The ID of the user to unban")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for the unban")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const userId = interaction.options.getString("user_id");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            // Validate user ID format
            if (!/^\d{17,19}$/.test(userId)) {
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed("Invalid user ID format.")],
                    ephemeral: true,
                });
                return;
            }

            // Check if user is actually banned
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("This user is not banned."),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Unban the user
            await interaction.guild.members.unban(userId, reason);

            // Create success embed
            const successEmbed = Utils.createSuccessEmbed(
                `**User:** ${Utils.formatUser(
                    bannedUser.user
                )}\n**Reason:** ${reason}\n**Moderator:** ${Utils.formatUser(
                    interaction.user
                )}`,
                "✅ User Unbanned"
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} unbanned ${Utils.formatUser(bannedUser.user)} for: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error unbanning user: ${error.message}`, "ERROR");

            if (error.code === 10026) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("This user is not banned."),
                    ],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Failed to unban the user. Please check my permissions."
                        ),
                    ],
                    ephemeral: true,
                });
            }
        }
    },
};
