const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Utils = require("../../utils/Utils");
const Logger = require("../../utils/Logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member from the server")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to ban")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Reason for the ban")
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("delete_days")
                .setDescription("Days of messages to delete (0-7)")
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    adminOnly: true,

    async execute(interaction) {
        if (!(await Utils.validateAdminPermissions(interaction))) return;

        const targetUser = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided";
        const deleteDays = interaction.options.getInteger("delete_days") || 0;

        try {
            // Check if user is already banned
            const banList = await interaction.guild.bans.fetch();
            if (banList.has(targetUser.id)) {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed("This user is already banned."),
                    ],
                    ephemeral: true,
                });
                return;
            }

            // Check if target is bot owner
            if (targetUser.id === interaction.client.user.id) {
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed("I cannot ban myself!")],
                    ephemeral: true,
                });
                return;
            }

            // Try to get member info (they might not be in the server)
            let targetMember = null;
            try {
                targetMember = await interaction.guild.members.fetch(
                    targetUser.id
                );

                // Check if target is bannable
                if (!targetMember.bannable) {
                    await interaction.reply({
                        embeds: [
                            Utils.createErrorEmbed(
                                "I cannot ban this user. They may have higher permissions than me."
                            ),
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
                                "I cannot ban other administrators."
                            ),
                        ],
                        ephemeral: true,
                    });
                    return;
                }
            } catch (error) {
                // User is not in the server, but we can still ban them
                Utils.log(
                    `User ${Utils.formatUser(
                        targetUser
                    )} not in server, proceeding with ban`,
                    "INFO"
                );
            }

            // Attempt to DM the user before banning (only if they're in the server)
            if (targetMember) {
                try {
                    const dmEmbed = Utils.createErrorEmbed(
                        `You have been banned from **${interaction.guild.name}**\n**Reason:** ${reason}`,
                        "🔨 You have been banned"
                    );
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // User has DMs disabled or blocked the bot
                    Utils.log(
                        `Could not DM ${Utils.formatUser(
                            targetUser
                        )} about ban`,
                        "WARN"
                    );
                }
            }

            // Ban the user
            await interaction.guild.members.ban(targetUser.id, {
                reason: reason,
                deleteMessageDays: deleteDays,
            });

            // Log the action to audit log
            await Logger.logAction({
                guildId: interaction.guild.id,
                action: "ban",
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                reason,
                details: {
                    deleteDays,
                    targetTag: targetUser.tag,
                },
            });

            // Create success embed
            const successEmbed = Utils.createSuccessEmbed(
                `**User:** ${Utils.formatUser(
                    targetUser
                )}\n**Reason:** ${reason}\n**Messages Deleted:** ${deleteDays} days\n**Moderator:** ${Utils.formatUser(
                    interaction.user
                )}`,
                "🔨 User Banned"
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log the action
            Utils.log(
                `${Utils.formatUser(
                    interaction.user
                )} banned ${Utils.formatUser(targetUser)} for: ${reason}`
            );
        } catch (error) {
            Utils.log(`Error banning user: ${error.message}`, "ERROR");

            if (error.code === 10007) {
                await interaction.reply({
                    embeds: [Utils.createErrorEmbed("User not found.")],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [
                        Utils.createErrorEmbed(
                            "Failed to ban the user. Please check my permissions."
                        ),
                    ],
                    ephemeral: true,
                });
            }
        }
    },
};
