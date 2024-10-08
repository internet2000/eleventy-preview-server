import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Initialize SQLite database with Promises
async function initDB() {
  // Open the database
  const db = await open({
    filename: '/tmp/preview-cache.db',  // Path to the SQLite database file
    driver: sqlite3.Database            // Use sqlite3 as the database driver
  });

  // Create the cache table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized successfully');
  return db;
}

// Initialize the database when the app starts
let db;
initDB().then((database) => {
  db = database;
});

// Insert or update cache value
export async function setCache(key, value) {
  const valueString = JSON.stringify(value);  // Convert value to string
  await db.run(
    `INSERT INTO cache (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, valueString]
  );
}

// Retrieve a cache value by key
export async function getCache(key) {
  const result = await db.get(`SELECT value FROM cache WHERE key = ?`, key);
  return result ? JSON.parse(result.value) : null;  // Parse JSON value back to object
}

// Clean up old cache entries
export async function cleanUpCache() {
  await db.run(`DELETE FROM cache WHERE updated_at < datetime('now', '-1 day')`);
}
