const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.db");

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
      } else {
        console.log("✓ Connected to SQLite database");
        this.initialize();
      }
    });
  }

  initialize() {
    // Enable foreign keys
    this.db.run("PRAGMA foreign_keys = ON");

    // Create default tables if they don't exist
    this.db.run(`
        CREATE TABLE IF NOT EXISTS guild_config (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT,
            hide_non_roles BOOLEAN DEFAULT 0
        );
    `);

    this.db.run(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,  -- unique sequential ID
            type TEXT NOT NULL,                     -- type of event, e.g., "user_joined"
            payload TEXT NOT NULL,                  -- JSON string with event data
            status TEXT NOT NULL DEFAULT 'new',     -- 'new', 'processing', 'done', 'failed'
            retry_count INTEGER NOT NULL DEFAULT 0, -- how many times we've tried processing
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
  }

  /**
   * Run a query (INSERT, UPDATE, DELETE)
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  /**
   * Get a single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          console.log("Database connection closed");
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();
