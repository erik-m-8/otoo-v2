const {
  Client,
  GatewayIntentBits,
  Collection,
  Message,
  REST,
  Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const db = require("../utils/Database");
const MessageService = require("./MessageService");

class DiscordService {
  constructor(credentials) {
    this.credentials = credentials;
    this.guilds = new Map(); // Local store of guilds
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });
    this.client.commands = new Collection();
    this.setupEvents();
    this.loadCommands();
  }

  setupEvents() {
    this.client.once("ready", async () => {
      console.log(`\n✅ Bot logged in as ${this.client.user.tag}\n`);
      await this.loadGuildsFromDatabase();
      await this.deployCommands();
      this.messageService = new MessageService(
        this.client,
        Array.from(this.guilds.keys()),
      );
    });

    this.client.on("guildCreate", async (guild) => {
      console.log(
        `\n🎉 Bot installed in guild: ${guild.name} (ID: ${guild.id})\n`,
      );
      try {
        // Store in local memory
          const discordGuild = await this.client.guilds.fetch(guild.id);
          this.guilds.set(discordGuild.id, {
            id: discordGuild.id,
            name: discordGuild.name,
            loadedAt: new Date(),
          });
        // Store guild config in database
        await db.run(
          `INSERT INTO guild_config (guild_id, worker_id, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (guild_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [guild.id, this.credentials.workerId],
        );
        console.log(`✓ Guild config created for ${guild.name}`);
        console.log(`✓ Guilds in memory: ${this.guilds.size}`);
      } catch (error) {
        console.error(`Error saving guild config:`, error);
      }
    });

    this.client.on("guildDelete", async (guild) => {
      console.log(
        `\n👋 Bot removed from guild: ${guild.name} (ID: ${guild.id})\n`,
      );
      try {
        // Remove from local memory
        this.guilds.delete(guild.id);
        // You can delete or archive the guild config here
        await db.run(`DELETE FROM guild_config WHERE guild_id = $1`, [
          guild.id,
        ]);
        console.log(`✓ Guild config removed for ${guild.name}`);
        console.log(`✓ Guilds in memory: ${this.guilds.size}`);
      } catch (error) {
        console.error(`Error removing guild config:`, error);
      }
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const command = this.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `Error executing command ${interaction.commandName}:`,
          error,
        );
      }
    });

    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down...");
      await db.close();
      process.exit(0);
    });
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, "../commands");
    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          this.client.commands.set(command.data.name, command);
          console.log(`✓ Loaded command: ${command.data.name}`);
        } else {
          console.warn(
            `⚠ Command at ${filePath} is missing required properties`,
          );
        }
      }
    }
  }

  async loadGuildsFromDatabase() {
    try {
      const guildConfigs = await db.all(
        `SELECT * FROM guild_config WHERE worker_id = $1`,
        [this.credentials.workerId],
      );

      if (guildConfigs.length === 0) {
        console.log(`ℹ No guilds found for this worker in database`);
        return;
      }

      for (const config of guildConfigs) {
        try {
          const discordGuild = await this.client.guilds.fetch(config.guild_id);
          this.guilds.set(discordGuild.id, {
            id: discordGuild.id,
            channelId: config.channel_id,
            hideNonRoles: config.hide_non_roles,
            name: discordGuild.name,
            loadedAt: new Date(),
          });
        } catch (error) {
          console.warn(
            `Failed to load guild ${config.guild_id}:`,
            error.message,
          );
        }
      }

      console.log(`✓ Loaded ${this.guilds.size} guilds from database`);
    } catch (error) {
      console.error(`Error loading guilds from database:`, error);
    }
  }

  async start() {
    const token = this.credentials?.token;
    await this.client.login(token);
  }

  async deployCommands() {
    try {
      const commands = [];
      const commandsPath = path.join(__dirname, "../commands");

      if (!fs.existsSync(commandsPath)) {
        console.log("ℹ No commands directory found");
        return;
      }

      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
        }
      }

      if (commands.length === 0) {
        console.log("ℹ No commands to deploy");
        return;
      }

      const rest = new REST().setToken(
        this.credentials?.token,
      );
      const clientId = this.credentials?.clientId;
      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });

      console.log(
        `✓ Successfully deployed ${data.length} application (/) commands`,
      );
    } catch (error) {
      console.error("Error deploying commands:", error);
    }
  }

  async handleAblyMessage(data) {
    const messageService = new MessageService(
      this.client,
      Array.from(this.guilds.values()),
    );
    await messageService.processData(data.data);
  }
}

module.exports = DiscordService;
