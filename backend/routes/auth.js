const express = require('express');
const crypto  = require('crypto');
const { pool } = require('../config/db');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain + 'flow4ward_salt').digest('hex');
}

/**
 * Drop and recreate the users table with the correct schema.
 * Runs once per server boot — safe because IF NOT EXISTS / DROP IF EXISTS.
 */
let migrated = false;
async function ensureTable() {
  if (migrated) return;
  migrated = true; // prevent concurrent calls

  // Check if 'passwd' column already exists
  const check = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'passwd'
  `);

  if (check.rows.length === 0) {
    // Either: table doesn't exist yet, or it has the old 'password' column.
    // Drop the old table (loses only test data), then create fresh.
    console.log('[auth] Migrating users table to new schema...');
    await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
    await pool.query(`
      CREATE TABLE users (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT UNIQUE NOT NULL,
        passwd     TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('[auth] users table ready.');
  }
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    await ensureTable();

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, passwd) VALUES ($1, $2, $3) RETURNING id, name, email`,
      [name.trim(), email.toLowerCase().trim(), hashed]
    );

    const user = rows[0];
    res.status(201).json({
      message: 'Account created successfully.',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[auth/register] ERROR:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    await ensureTable();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, passwd FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
    }

    const dbUser = rows[0];
    const hashed = hashPassword(password);

    if (dbUser.passwd !== hashed) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    res.json({
      message: 'Login successful.',
      user: { id: dbUser.id, name: dbUser.name, email: dbUser.email },
    });
  } catch (err) {
    console.error('[auth/login] ERROR:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
