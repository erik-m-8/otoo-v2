# Discord Otto Bot

A Discord bot built with discord.js featuring slash commands.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3. Deploy Commands

Before running the bot for the first time, deploy your slash commands:

```bash
node deploy-commands.js
```

### 4. Start the Bot

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Creating New Commands

Create a new file in the `commands/` directory:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description'),
  
  async execute(interaction) {
    await interaction.reply('Command response');
  },
};
```

Then redeploy commands:

```bash
node deploy-commands.js
```

## Project Structure

```
discord-otto/
├── commands/              # Slash command files
│   └── ping.js           # Example ping command
├── index.js              # Main bot file
├── deploy-commands.js    # Command deployment script
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Features

- ✅ Slash command handler
- ✅ Automatic command loading
- ✅ Error handling
- ✅ Environment configuration
- ✅ Command deployment script

## Resources

- [discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
