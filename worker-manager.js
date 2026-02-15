// worker-manager.js
// This script spins up multiple workers running DiscordService

const { Worker } = require('worker_threads');
const path = require('path');
const db = require('./utils/Database');

const workers = [];

async function startWorkersFromDb() {
  try {
    // Fetch all tokens from the workers table
    const workerRecords = await db.all('SELECT id, token, client_id FROM workers');
    
    if (workerRecords.length === 0) {
      console.warn('No worker tokens found in database');
      return;
    }
    console.log(`Starting ${workerRecords.length} workers from database...`);
    workerRecords.forEach((record, i) => {
      const credentials = { token: record.token, clientId: record.client_id, workerId: record.id };
      const worker = new Worker(path.resolve(__dirname, 'worker-discordService.js'), {
        workerData: { workerId: i, credentials }
      });
      worker.on('online', () => {
        console.log(`Worker ${i} (db id: ${record.id}) is online`);
      });
      worker.on('exit', code => {
        console.log(`Worker ${i} (db id: ${record.id}) exited with code ${code}`);
      });
      worker.on('error', err => {
        console.error(`Worker ${i} (db id: ${record.id}) error:`, err);
      });
      workers.push(worker);
    });
  } catch (err) {
    console.error('Error starting workers from database:', err);
  }
}

function sendDataToWorkers(data) {
  workers.forEach(worker => {
    worker.postMessage(data);
  });
}

module.exports = { workers, sendDataToWorkers, startWorkersFromDb };
