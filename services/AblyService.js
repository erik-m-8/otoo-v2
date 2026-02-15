const Ably = require('ably');

class AblyService {
  constructor(credentials) {
    this.credentials = credentials;
    this.client = null;
    this.channel = null;
    this.messageHandlers = [];
  }

  async connect() {
    try {
      const apiKey = this.credentials?.ablyKey || process.env.ABLY_API_KEY;
      
      if (!apiKey) {
        throw new Error('Ably API key not provided in credentials or environment');
      }

      this.client = new Ably.Realtime(apiKey);

      this.client.connection.on('connected', () => {
        console.log('✓ Connected to Ably');
      });

      this.client.connection.on('failed', (err) => {
        console.error('✗ Ably connection failed:', err);
      });

      return new Promise((resolve, reject) => {
        this.client.connection.once('connected', resolve);
        this.client.connection.once('failed', reject);
      });
    } catch (err) {
      console.error('Error connecting to Ably:', err);
      throw err;
    }
  }

  async subscribe(channelName) {
    try {
      if (!this.client) {
        await this.connect();
      }

      this.channel = this.client.channels.get(channelName);

      this.channel.subscribe((message) => {
        console.log(`📨 Message received on ${channelName}`);
        this.messageHandlers.forEach(handler => {
          try {
            handler(message.data);
          } catch (err) {
            console.error('Error in message handler:', err);
          }
        });
      });

      console.log(`✓ Subscribed to Ably channel: ${channelName}`);
    } catch (err) {
      console.error(`Error subscribing to channel ${channelName}:`, err);
      throw err;
    }
  }

  onMessage(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.push(handler);
    }
  }

  async publish(data) {
    try {
      if (!this.channel) {
        throw new Error('Not subscribed to a channel');
      }
      await this.channel.publish('message', data);
      console.log('✓ Message published to Ably channel');
    } catch (err) {
      console.error('Error publishing message:', err);
      throw err;
    }
  }

  async close() {
    try {
      if (this.client) {
        this.client.close();
        console.log('✓ Ably connection closed');
      }
    } catch (err) {
      console.error('Error closing Ably connection:', err);
      throw err;
    }
  }
}

module.exports = AblyService;
