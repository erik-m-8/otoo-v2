const { SlashCommandBuilder, ChannelType } = require("discord.js");
const db = require("../utils/Database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure bot settings")
    .addSubcommand((sub) =>
      sub
        .setName("channel")
        .setDescription("Set the channel for bot messages")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The channel to send messages to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current configuration"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("hide")
        .setDescription("Hide non-role items in messages")
        .addBooleanOption(
          (option) =>
            option
              .setName("hide") // name of the boolean
              .setDescription("Hide non-role items?")
              .setRequired(true), // optional if you want
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("reset").setDescription("Reset configuration"),
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "channel": {
          const channel = interaction.options.getChannel("channel");

          await db.run(
            `
            INSERT INTO guild_config (guild_id, channel_id, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(guild_id)
            DO UPDATE SET channel_id = $2, updated_at = CURRENT_TIMESTAMP
            `,
            [guildId, channel.id],
          );

          await interaction.reply(
            `✅ Bot messages will now be sent to ${channel}`,
          );
          break;
        }

        case "view": {
          const config = await db.get(
            "SELECT channel_id, hide_non_roles FROM guild_config WHERE guild_id = $1",
            [guildId],
          );

          if (!config) {
            await interaction.reply(
              "⚠️ No configuration found for this server.",
            );
            return;
          }

          await interaction.reply(
            `📌 **Current Configuration**\nChannel: <#${config.channel_id}> and Hide Non-Roles: ${config.hide_non_roles ? "Yes" : "No"}`,
          );
          break;
        }

        case "hide": {
          const hide = interaction.options.getBoolean("hide");
          console.log(hide);
          await db.run(
            `
            INSERT INTO guild_config (guild_id, hide_non_roles, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(guild_id)
            DO UPDATE SET hide_non_roles = $2, updated_at = CURRENT_TIMESTAMP
            `,
            [guildId, hide],
          );

          await interaction.reply(
            `✅ Non-role items will ${hide ? "be hidden" : "not be hidden"} in messages. ${hide}`,
          );
          break;
        }

        case "reset": {
          await db.run("DELETE FROM guild_config WHERE guild_id = $1", [
            guildId,
          ]);

          await interaction.reply("♻️ Configuration has been reset.");
          break;
        }
      }
    } catch (error) {
      console.error("Error in setup command:", error);

      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ An error occurred while processing your request.",
          ephemeral: true,
        });
      }
    }
  },
};
