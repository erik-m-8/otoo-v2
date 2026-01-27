const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const eventBus = require('../utils/EventBus');

// Store for recent stream events (last 10)
let recentEvents = [];

// Listen to stream data and store it
eventBus.onStreamData('api-stream', (data) => {
  recentEvents.unshift(data);
  if (recentEvents.length > 10) {
    recentEvents.pop();
  }
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stream')
    .setDescription('View API stream data')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check stream listener status')
    )
    .addSubcommand(sub =>
      sub.setName('latest')
        .setDescription('View latest stream events')
        .addNumberOption(opt =>
          opt.setName('count')
            .setDescription('Number of events to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const statusEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔄 Stream Listener Status')
        .addFields(
          { name: 'Recent Events', value: recentEvents.length.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [statusEmbed] });
    }

    if (subcommand === 'latest') {
      const count = interaction.options.getNumber('count') || 5;
      const events = recentEvents.slice(0, count);

      if (events.length === 0) {
        await interaction.reply('📭 No stream events yet');
        return;
      }

      const eventsStr = events
        .map((e, i) => `**${i + 1}.** \`\`\`json\n${JSON.stringify(e, null, 2)}\n\`\`\``)
        .join('\n');

      const eventEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('📨 Latest Stream Events')
        .setDescription(eventsStr.length > 4096 ? eventsStr.substring(0, 4090) + '...' : eventsStr)
        .setTimestamp();

      await interaction.reply({ embeds: [eventEmbed] });
    }
  },
};
