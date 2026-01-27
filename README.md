# Discord Otto Bot

A Discord bot to auto send messages to a channel with up to date stock.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

Thanks Romann for the easy API
```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
API_STREAM_URL=https://mg-api.ariedam.fr/
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
## setup
/setup channel -- this is the channel the bot will right to.
/setup hide -- this will hide non mentions 

## Disclaimer
This was written quickly and is messy but has been stable and working. Im releasing it for others to use and I will maybe update it later. 

## Resources

- [discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
