const { EmbedBuilder } = require("discord.js");
const db = require("../utils/Database");

/**
 * Service to send messages to Discord channels
 * Provides methods to send text, embeds, and other message types
 */
class MessageService {
  constructor(client, guilds) {
    this.client = client;
    this.guilds = guilds;
  }

  async processData(data) {
    for (const guild of this.guilds) {
      const content = this.buildContent(data, guild.id, guild.hideNonRoles);

      if (!guild || !guild.channelId) {
        console.warn(`⚠ No channel configured for guild ${guild.id}`);
        continue;
      }
      if (!content) {
        console.log(`ℹ No content to send for guild ${guild.id}`);
        continue;
      }
      try {
        this.sendMessage(guild.channelId, content);
      } catch (error) {
        console.error(`❌ Failed to send message to ${guild.channelId}:`, error.message);
      }
    }
  }

  buildContent(data, guildId, hideItems = false) {
    let message = "";
    for (const item of data) {
      const name = item.name.split(/(?=[A-Z])/).join(" ");
      const role = this.client.guilds.cache
        .get(String(guildId))
        .roles.cache.find((r) => r.name === name);
      if (role) {
        message += ` <@&${role.id}>  ${item.stock} |`;
      } else {
        if (!hideItems) {
          message += ` ${name}  ${item.stock} |`;
        }
      }
    }
    return message.slice(0, -1);
  }
  /**
   * Send a simple text message to a channel
   * @param {string} channelId - The Discord channel ID
   * @param {string} content - The message content
   * @returns {Promise<Message>} The sent message
   */
  async sendMessage(channelId, content) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      const message = await channel.send(content);
      console.log(`✅ Message sent to ${channelId}`);
      return message;
    } catch (error) {
      console.error(
        `❌ Failed to send message to ${channelId}:`,
        error.message,
      );
    }
  }

  /**
   * Send an embed to a channel
   * @param {string} channelId - The Discord channel ID
   * @param {EmbedBuilder} embed - The embed to send
   * @returns {Promise<Message>} The sent message
   */
  async sendEmbed(channelId, embed) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      const message = await channel.send({ embeds: [embed] });
      console.log(`✅ Embed sent to ${channelId}`);
      return message;
    } catch (error) {
      console.error(`❌ Failed to send embed to ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a message with embeds and content
   * @param {string} channelId - The Discord channel ID
   * @param {string} content - The message content
   * @param {Array<EmbedBuilder>} embeds - Array of embeds
   * @returns {Promise<Message>} The sent message
   */
  async sendMessageWithEmbeds(channelId, content, embeds = []) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      const message = await channel.send({
        content,
        embeds,
      });
      console.log(`✅ Message with embeds sent to ${channelId}`);
      return message;
    } catch (error) {
      console.error(
        `❌ Failed to send message to ${channelId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Send a message to a user's DM
   * @param {string} userId - The Discord user ID
   * @param {string} content - The message content
   * @returns {Promise<Message>} The sent message
   */
  async sendDM(userId, content) {
    try {
      const user = await this.client.users.fetch(userId);
      const message = await user.send(content);
      console.log(`✅ DM sent to ${userId}`);
      return message;
    } catch (error) {
      console.error(`❌ Failed to send DM to ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Send an embed to a user's DM
   * @param {string} userId - The Discord user ID
   * @param {EmbedBuilder} embed - The embed to send
   * @returns {Promise<Message>} The sent message
   */
  async sendDMEmbed(userId, embed) {
    try {
      const user = await this.client.users.fetch(userId);
      const message = await user.send({ embeds: [embed] });
      console.log(`✅ DM embed sent to ${userId}`);
      return message;
    } catch (error) {
      console.error(`❌ Failed to send DM to ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Edit a message
   * @param {string} channelId - The Discord channel ID
   * @param {string} messageId - The message ID
   * @param {string|Object} content - The new content or message options
   * @returns {Promise<Message>} The edited message
   */
  async editMessage(channelId, messageId, content) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      const message = await channel.messages.fetch(messageId);
      const edited = await message.edit(content);
      console.log(`✅ Message edited in ${channelId}`);
      return edited;
    } catch (error) {
      console.error(
        `❌ Failed to edit message in ${channelId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {string} channelId - The Discord channel ID
   * @param {string} messageId - The message ID
   * @returns {Promise<void>}
   */
  async deleteMessage(channelId, messageId) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      await channel.messages.delete(messageId);
      console.log(`✅ Message deleted from ${channelId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete message in ${channelId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * React to a message
   * @param {string} channelId - The Discord channel ID
   * @param {string} messageId - The message ID
   * @param {string} emoji - The emoji to react with
   * @returns {Promise<MessageReaction>} The reaction
   */
  async reactMessage(channelId, messageId, emoji) {
    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel.isTextBased()) {
        throw new Error("Channel is not a text channel");
      }

      const message = await channel.messages.fetch(messageId);
      const reaction = await message.react(emoji);
      console.log(`✅ Reaction added to message in ${channelId}`);
      return reaction;
    } catch (error) {
      console.error(
        `❌ Failed to react to message in ${channelId}:`,
        error.message,
      );
      throw error;
    }
  }
}

module.exports = MessageService;
