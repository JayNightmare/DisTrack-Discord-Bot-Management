const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove-timeout")
        .setDescription("Remove timeout from a member")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to remove timeout from")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for removing the timeout")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const targetUser = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            const targetMember = await interaction.guild.members.fetch(
                targetUser.id
            );

            // Check if user is actually timed out
            if (!targetMember.communicationDisabledUntil) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("This user is not timed out."),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Check if target is moderatable
            if (!targetMember.moderatable) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "I cannot modify this user. They may have higher permissions than me."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Remove timeout
            await targetMember.timeout(null, reason);

            // Attempt to DM the user
            try {
                const dmEmbed = Utils.createSuccessEmbed(
                    `Your timeout has been removed in **${interaction.guild.name}**\n**Reason:** ${reason}`,
                    "✅ Timeout Removed"
                );
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                Utils.log(
                    `Could not DM ${Utils.formatUser(
                        targetUser
                    )} about timeout removal`,
                    "WARN"
                );
            }

            // Create success embed
            const successEmbed = Utils.createSuccessEmbed(
                `**User:** ${Utils.formatUser(
                    targetUser
                )}\n**Reason:** ${reason}\n**Moderator:** ${Utils.formatUser(
                    interaction.user
                )}`,
                "✅ Timeout Removed"
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} removed timeout from ${Utils.formatUser(
                    targetUser
                )}: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error removing timeout: ${error.message}`, "ERROR");

            if (error.code === 10007) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "User not found in this server."
                        ),
                    ],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Failed to remove timeout. Please check my permissions."
                        ),
                    ],
                    ephemeral: true,
                });
            }
        }
    },
};
