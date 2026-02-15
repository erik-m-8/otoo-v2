
require("dotenv").config();

const db = require("./utils/Database");
const { sendDataToWorkers, startWorkersFromDb } = require("./worker-manager");
const AblyService = require("./services/AblyService");

// Initialize database and start everything
db.initialize().then(() => {
  // Initialize Ably service
  const ablyService = new AblyService();

  // Start Ably service and subscribe to channels
  return ablyService.connect().then(() => {
    return Promise.all([
      ablyService.subscribe("persisted:shops"),
      ablyService.subscribe("persisted:weather"), 
    ]);
  }).then(() => {
    ablyService.onMessage((data) => {
      console.log("Received message from Ably:", data);
      sendDataToWorkers(data);
    });
  }).catch(err => {
    console.error("Error setting up Ably service:", err);
  });
}).then(() => {
  // Start workers from database
  return startWorkersFromDb();
}).then(() => {
  console.log("✓ All services initialized successfully");
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
