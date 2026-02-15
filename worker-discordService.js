// worker-discordService.js
// Worker thread entry point for DiscordService

const { workerData, parentPort } = require("worker_threads");

const DiscordService = require("./services/DiscordService");

let discordService = null;

(async () => {
  try {
    const { workerId, credentials } = workerData;
    console.log(`Worker ${workerId} starting DiscordService...`);
    discordService = new DiscordService(credentials);
    await discordService.start();

    // Set up message handler after service is initialized
    parentPort.on("message", async (data) => {
      try {
        if (discordService) {
          await discordService.handleAblyMessage(data);
        } else {
          console.warn("DiscordService not yet initialized");
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });

    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error(`Worker ${workerData.workerId} failed:`, err);
    process.exit(1);
  }
})();
