const { EventSource } = require("eventsource");
const MessageService = require("./MessageService");
const eventBus = require("../utils/EventBus");

/**
 * Background task that listens to an API stream via SSE
 */
class StreamListener {
  constructor(client, apiUrl) {
    this.client = client;
    this.apiUrl = apiUrl;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.timeData = {};
    this.weather = "";
    this.source = null;
  }

  async start() {
    if (this.isRunning) {
      console.warn("⚠ Stream listener already running");
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting SSE stream listener: ${this.apiUrl}`);
    this.connect();
  }

  connect() {
    this.source = new EventSource(this.apiUrl);

    // Generic messages (no event name)
    this.source.onmessage = (event) => {
      this.handleData(event.data);
    };

    // Named SSE event: event: shops
    this.source.addEventListener("shops", (event) => {
      this.handleData(event.data);
    });

    this.source.addEventListener("weather", (event) => {
      console.log("🌤 Weather event received");
      this.handleWeatherData(event.data);
    });

    this.source.onerror = (err) => {
      console.error("❌ SSE error", err);
      this.retry();
    };
  }

  handleData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      let messageData = [];
      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      Object.keys(data).forEach((key) => {
        if (!this.timeData[key]) {
          this.timeData[key] = {
            lastrun: null,
            itemLength: 0,
            items: [],
          };
        }

        const incomingTime = Number(data[key]?.secondsUntilRestock);
        const incomingItems = data[key].items ?? [];

        const prevItems = this.timeData[key].items ?? [];
        const prevNames = new Set(prevItems.map((i) => i.name));
        const newItems = incomingItems.filter(
          (item) => !prevNames.has(item.name),
        );

        const currentTime = this.timeData[key].lastrun;

        // Restock timer reset (counting DOWN)
        if (currentTime === null || incomingTime > currentTime) {
          this.timeData[key].lastrun = incomingTime;
          this.timeData[key].items = incomingItems;
          messageData = [...messageData, ...data[key].items];
        } else if (newItems.length > 0) {
          console.log("🆕 New items detected:", newItems);
          // update stored state
          this.timeData[key].items = incomingItems;
          messageService.processData(newItems);
        } else {
          this.timeData[key].lastrun = incomingTime;
        }
      });
      if (messageData.length === 0) {
        return;
      }
      messageService = new MessageService(this.client, guildIds);
      messageService.processData(messageData);
      this.retryCount = 0;
    } catch (err) {
      console.warn("⚠ Failed to parse SSE JSON:", err);
    }
  }

  handleWeatherData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const incomingWeather = data.weather ?? "";

      const prevWeather = this.weather;
      if (prevWeather !== incomingWeather) {
        this.weather = incomingWeather;
        const guildIds = this.client.guilds.cache.map((guild) => guild.id);
        messageService = new MessageService(this.client, guildIds);
        messageService.processData([{ name: incomingWeather, stock: "" }]);
      }
      console.log("🌤 Weather data received:", data);
      this.retryCount = 0;
    } catch (err) {
      console.warn("⚠ Failed to parse SSE JSON:", err);
    }
  }

  retry() {
    if (!this.isRunning) return;

    this.retryCount++;
    this.source.close();

    if (this.retryCount > this.maxRetries) {
      console.error("❌ Max retries reached");
      this.stop();
      return;
    }

    console.log(`🔄 Reconnecting SSE (${this.retryCount}/${this.maxRetries})`);
    setTimeout(() => this.connect(), 5000);
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.source?.close();
    this.source = null;

    console.log("🛑 SSE stream listener stopped");
    eventBus.emitStatus("stream-listener", "stopped");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      retryCount: this.retryCount,
      apiUrl: this.apiUrl,
    };
  }
}

module.exports = StreamListener;
