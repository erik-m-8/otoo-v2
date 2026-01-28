require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const db = require("./utils/Database");
const StreamListener = require("./services/StreamListener");
const eventBus = require("./utils/EventBus");
const MessageService = require("./services/MessageService");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

// Collection to store slash comman
// Bot ready event
client.once("ready", () => {
  console.log(`\n✅ Bot logged in as ${client.user.tag}\n`);
  // Initialize stream listener (background task)
  let ShopListener = null;
  if (process.env.API_STREAM_URL) {
    ShopListener = new StreamListener(
      client,
      process.env.API_STREAM_URL + "live/stream",
    );
  }
  // Initialize message service
  const messageService = new MessageService(client);

  // Make messageService available globally
  global.messageService = messageService;

  // Start background stream listener
  if (ShopListener) {
    ShopListener.start().catch((err) => {
      console.error("Failed to start stream listener:", err);
    });
  }
});
client.commands = new Collection();

// Load commands from commands directory
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`✓ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠ Command at ${filePath} is missing required properties`);
    }
  }
}

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
  }
});

//Listen to stream errors and log them
eventBus.onError("stream-listener", (error) => {
  console.error("🚨 Stream listener error:", error.message);
});

// Listen to stream status updates
eventBus.onStatus("stream-listener", (status) => {
  console.log(`📊 Stream status: ${status}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await db.close();
  process.exit(0);
});

// Login with token
client.login(process.env.DISCORD_TOKEN);
