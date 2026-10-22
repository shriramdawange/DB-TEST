'use strict';

/**
 * db.js
 * -----
 * SQLite connection for the College Students Record Portal, using
 * better-sqlite3 (synchronous, fast, zero-config — no server to install).
 *
 * Configuration comes from `.env` (see `.env.example`):
 *   DB_FILE   path to the database file (relative paths resolve from backend/)
 *   SEED_DATA set to "false" to skip the sample rows in database/schema.sql
 *
 * The database file and the table are created automatically on first boot,
 * so there is nothing to import by hand.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PROJECT_ROOT = path.join(__dirname, '..');
const SCHEMA_FILE = path.join(PROJECT_ROOT, 'database', 'schema.sql');

/** Resolve the database file path (relative paths are relative to backend/). */
function resolveDbFile() {
  const configured = process.env.DB_FILE || path.join('data', 'college_portal.db');
  return path.isAbsolute(configured)
    ? configured
    : path.join(__dirname, configured);
}

const DB_FILE = resolveDbFile();

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);

// WAL keeps reads fast while a write is in progress.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Creates the table (and the optional sample rows) from database/schema.sql.
 * The schema file is split at the `-- SEED:` marker:
 *   - everything before it  -> DDL, always executed (idempotent)
 *   - everything after it   -> sample data, executed unless SEED_DATA=false
 */
function applySchema() {
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const parts = sql.split(/^[ \t]*--[ \t]*SEED[ \t]*:.*$/m);
  const ddl = parts[0];
  const seed = parts.slice(1).join('\n');

  db.exec(ddl);

  const seedEnabled = String(process.env.SEED_DATA || 'true').toLowerCase() !== 'false';
  if (seedEnabled && seed.trim()) {
    db.exec(seed);
  }

  return { seeded: seedEnabled && Boolean(seed.trim()) };
}

/** Quick liveness check — returns true/false instead of throwing. */
function checkConnection() {
  try {
    db.prepare('SELECT 1 AS ok').get();
    return true;
  } catch (err) {
    console.error('  [DB] Connection failed:', err.message);
    return false;
  }
}

module.exports = {
  db,
  applySchema,
  checkConnection,
  DB_FILE,
  SCHEMA_FILE
};
