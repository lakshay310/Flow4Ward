/**
 * Run this ONCE to create all tables in your Neon database.
 * Usage: node backend/utils/initDB.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function initDB() {
  console.log('🔧 Initializing Neon PostgreSQL schema...');
  const sql = fs.readFileSync(path.join(__dirname, '../config/schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('✅ Schema created successfully!');
  console.log('   Tables: events, traffic_records, alerts, predictions');
  console.log('\n📌 Next step: Run `node backend/utils/seedData.js` to populate with Bengaluru data.');
  await pool.end();
  process.exit(0);
}

initDB().catch((err) => {
  console.error('❌ Schema init error:', err.message);
  process.exit(1);
});
