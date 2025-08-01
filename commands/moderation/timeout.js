const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member for a specified duration")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to timeout")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("duration")
                .setDescription("Duration (e.g., 10m, 1h, 1d)")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for the timeout")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const targetUser = interaction.options.getUser("user");
        const durationStr = interaction.options.getString("duration");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            const targetMember = await interaction.guild.members.fetch(
                targetUser.id
            );

            // Parse duration
            const durationMs = Utils.parseDuration(durationStr);
            if (!durationMs) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Invalid duration format. Use formats like: 10m, 1h, 2d"
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Validate timeout duration (Discord limits)
            if (!Utils.isValidTimeoutDuration(durationMs)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Timeout duration must be between 1 second and 28 days."
                        ),
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
                            "I cannot timeout this user. They may have higher permissions than me."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Check if target is bot owner
            if (targetUser.id === interaction.client.user.id) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("I cannot timeout myself!"),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Check if target has admin permissions (extra safety)
            if (Utils.hasAdminPermissions(targetMember)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "I cannot timeout other administrators."
                        ),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Attempt to DM the user before timing out
            try {
                const dmEmbed = Utils.createWarningEmbed(
                    `You have been timed out in **${
                        interaction.guild.name
                    }**\n**Duration:** ${Utils.formatDuration(
                        durationMs
                    )}\n**Reason:** ${reason}`,
                    "⏰ You have been timed out"
                );
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                Utils.log(
                    `Could not DM ${Utils.formatUser(
                        targetUser
                    )} about timeout`,
                    "WARN"
                );
            }

            // Timeout the user
            await targetMember.timeout(durationMs, reason);

            // Create success embed
            const successEmbed = Utils.createSuccessEmbed(
                `**User:** ${Utils.formatUser(
                    targetUser
                )}\n**Duration:** ${Utils.formatDuration(
                    durationMs
                )}\n**Reason:** ${reason}\n**Moderator:** ${Utils.formatUser(
                    interaction.user
                )}`,
                "⏰ User Timed Out"
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} timed out ${Utils.formatUser(
                    targetUser
                )} for ${Utils.formatDuration(durationMs)}: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error timing out user: ${error.message}`, "ERROR");

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
                            "Failed to timeout the user. Please check my permissions."
                        ),
                    ],
                    ephemeral: true,
                });
            }
        }
    },
};
