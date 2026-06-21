const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

const { pool, getCongestionLabel } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ─── Init ──────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Test DB connection on startup
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Neon PostgreSQL connected');
}).catch(err => {
  console.error('❌ DB connection failed:', err.message);
});

// ─── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ Client disconnected: ${socket.id}`));
});

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/events',      require('./routes/events'));
app.use('/api/traffic',     require('./routes/traffic'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/alerts',      require('./routes/alerts'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Serve static assets from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Cron: Simulate live Bengaluru traffic updates every 30s ─────────────────
const zones = [
  'Central Zone 1', 'Central Zone 2',
  'North Zone 1',   'South Zone 1',
  'East Zone 1',    'West Zone 1',
];
const zoneCoords = {
  'Central Zone 1': { lat: 12.9762, lng: 77.5929 },
  'Central Zone 2': { lat: 12.9693, lng: 77.5937 },
  'North Zone 1':   { lat: 13.0418, lng: 77.5947 },
  'South Zone 1':   { lat: 12.9172, lng: 77.6220 },
  'East Zone 1':    { lat: 12.9694, lng: 77.7006 },
  'West Zone 1':    { lat: 13.0262, lng: 77.5442 },
};

cron.schedule('*/30 * * * * *', async () => {
  try {
    // Auto-update event statuses based on time
    await pool.query(`
      UPDATE events
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('upcoming', 'ongoing') AND end_date <= NOW()
    `);
    await pool.query(`
      UPDATE events
      SET status = 'ongoing', updated_at = NOW()
      WHERE status = 'upcoming' AND start_date <= NOW() AND end_date > NOW()
    `);

    const hour = new Date().getHours();
    const isRushHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21);
    const liveData = [];

    for (const zone of zones) {
      const itBoost = zone.includes('East') || zone.includes('Central') ? 8 : 0;
      const base = isRushHour ? 72 : 42;
      const congestionLevel = Math.min(100, Math.max(0, base + itBoost + Math.floor(Math.random() * 22) - 10));
      const coords = zoneCoords[zone];
      const congestionLabel = getCongestionLabel(congestionLevel);

      const { rows } = await pool.query(
        `INSERT INTO traffic_records
          (zone, lat, lng, timestamp, congestion_level, congestion_label, avg_speed, volume, source)
         VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,'api') RETURNING *`,
        [
          zone, coords.lat, coords.lng,
          congestionLevel, congestionLabel,
          Math.max(5, 60 - congestionLevel * 0.5),
          800 + congestionLevel * 20,
        ]
      );
      liveData.push({
        zone: rows[0].zone,
        congestionLevel: rows[0].congestion_level,
        congestionLabel: rows[0].congestion_label,
        avgSpeed: rows[0].avg_speed,
        volume: rows[0].volume,
        timestamp: rows[0].timestamp,
      });
    }

    io.emit('traffic_update', liveData);

    // Randomly emit a simulated alert (1 in 20 chance)
    if (Math.random() < 0.05) {
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const alertData = {
        type: 'high_congestion',
        severity: 'warning',
        title: `High Congestion Detected in ${zone}`,
        message: `Congestion spike detected in ${zone}. Current level: ${Math.floor(Math.random() * 30 + 65)}%`,
        zone,
        resolved: false,
      };
      const { rows } = await pool.query(
        `INSERT INTO alerts (type, severity, title, message, zone)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [alertData.type, alertData.severity, alertData.title, alertData.message, alertData.zone]
      );
      io.emit('new_alert', { ...alertData, _id: rows[0].id, id: rows[0].id, createdAt: rows[0].created_at });
    }
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚦 Traffic Intelligence Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for real-time updates`);
  console.log(`🌐 API: http://localhost:${PORT}/api/health\n`);
});
