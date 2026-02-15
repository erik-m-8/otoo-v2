const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  //ssl: false,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

class Database {
  constructor() {
    this.pool = pool;
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
    pool.on("connect", () => {
      console.log("✓ Connected to PostgreSQL database");
    });
  }

  initialize() {
    return new Promise(async (resolve, reject) => {
      try {
        // Create tables if they don't exist
        await this.run(`
          CREATE TABLE IF NOT EXISTS workers (
            id SERIAL PRIMARY KEY,
            token TEXT NOT NULL UNIQUE,
            client_id TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS guild_config (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT,
            hide_non_roles BOOLEAN DEFAULT FALSE,
            worker_id INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(worker_id) REFERENCES workers(id) ON DELETE SET NULL
          );
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            payload JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Insert tokens from environment variables
        const tokens = [
          { token: process.env.DISCORD_TOKEN, client_id: process.env.CLIENT_ID },
         // { token: process.env.DISCORD_TOKEN_2, client_id: process.env.CLIENT_ID_2 },
         // { token: process.env.DISCORD_TOKEN_3, client_id: process.env.CLIENT_ID_3 },
         // { token: process.env.DISCORD_TOKEN_4, client_id: process.env.CLIENT_ID_4 },
        ].filter(Boolean);

        for (const token of tokens) {
          try {
            await this.run(
              `INSERT INTO workers (token, client_id) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING`,
              [token.token, token.client_id]
            );
            console.log("✓ Token inserted into workers table");
          } catch (err) {
            console.error("Error inserting token into workers table:", err.message);
          }
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Run a query (INSERT, UPDATE, DELETE)
   */
  run(sql, params = []) {
    return this.pool.query(sql, params);
  }

  /**
   * Get a single row
   */
  async get(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows[0];
  }

  /**
   * Get all rows
   */
  async all(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      await this.pool.end();
      console.log("Database connection closed");
    } catch (err) {
      console.error("Error closing database connection:", err);
      throw err;
    }
  }
}

// Export singleton instance
const dbInstance = new Database();
module.exports = dbInstance;
