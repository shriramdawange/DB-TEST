'use strict';

/**
 * server.js
 * ---------
 * College Students Record Portal — API server.
 *
 * Boot order:
 *   1. load .env
 *   2. register middleware (cors, json body parser, logger)
 *   3. mount routes under /api/students
 *   4. register the 404 handler and the central error middleware
 *   5. open the SQLite database and apply database/schema.sql
 *   6. listen on process.env.PORT || 5000
 *
 * The server starts even if the database file cannot be opened — it logs a
 * friendly warning instead of crashing.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const studentsRouter = require('./routes/students');
const { db, applySchema, checkConnection, DB_FILE } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

// CORS: the plain frontend is served from a different origin (or from
// file://), so every origin is allowed for this read/write JSON API.
app.use(cors());

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logger.
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'College Students Record Portal API',
    version: '1.0.0',
    database: 'SQLite (better-sqlite3)',
    endpoints: [
      'GET    /api/health',
      'GET    /api/students?search=',
      'GET    /api/students/:id',
      'POST   /api/students',
      'PUT    /api/students/:id',
      'DELETE /api/students/:id'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: checkConnection() ? 'up' : 'down',
    file: DB_FILE,
    time: new Date().toISOString()
  });
});

app.use('/api/students', studentsRouter);

/* ------------------------------------------------------------------ */
/* 404 — unknown route                                                 */
/* ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

/* ------------------------------------------------------------------ */
/* Central error handling middleware                                   */
/* ------------------------------------------------------------------ */

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err.status || err.statusCode) || 500;
  const message =
    status >= 500
      ? 'Internal server error. Please try again later.'
      : err.message || 'Request failed.';

  const payload = { error: message };
  if (err.fieldErrors) {
    payload.errors = err.fieldErrors;
  }

  res.status(status).json(payload);
});

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  College Students Record Portal - API');
  console.log('  ------------------------------------');
  console.log(`  Server running at : http://localhost:${PORT}`);
  console.log(`  Health check      : http://localhost:${PORT}/api/health`);
  console.log('  Frontend          : ../frontend/index.html');
  console.log('');

  setupDatabase();
});

/**
 * Creates the database file / table if needed. Never throws: the API keeps
 * running so you can fix the path and restart without losing the process.
 */
function setupDatabase() {
  try {
    const { seeded } = applySchema();
    console.log(`  [OK]   SQLite database ready: ${DB_FILE}`);
    if (seeded) {
      console.log('  [OK]   Sample students loaded (set SEED_DATA=false to skip).');
    }
    console.log('');
  } catch (err) {
    console.warn('  [WARN] Could not open the database:', err.message);
    console.warn('         Check DB_FILE in backend/.env (and that the folder is writable).');
    console.warn('');
  }
}

/** Graceful shutdown so the database is closed cleanly. */
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down.`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      /* ignore */
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
