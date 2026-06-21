const { query, formatTrafficRecord, getCongestionLabel } = require('../config/db');

// GET /api/traffic
exports.getTrafficRecords = async (req, res) => {
  try {
    const { zone, hours = 24, limit = 200 } = req.query;
    const conditions = [`timestamp >= $1`];
    const values = [new Date(Date.now() - hours * 60 * 60 * 1000)];
    let i = 2;

    if (zone) { conditions.push(`zone = $${i++}`); values.push(zone); }
    values.push(parseInt(limit));

    const { rows } = await query(
      `SELECT * FROM traffic_records
       WHERE ${conditions.join(' AND ')}
       ORDER BY timestamp DESC
       LIMIT $${i}`,
      values
    );

    res.json({ success: true, data: rows.map(formatTrafficRecord) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/traffic/live
exports.getLiveTraffic = async (req, res) => {
  try {
    // Latest record per zone using DISTINCT ON
    const { rows } = await query(
      `SELECT DISTINCT ON (zone) *
       FROM traffic_records
       ORDER BY zone, timestamp DESC`
    );

    const data = rows.map(r => ({
      zone: r.zone,
      congestionLevel: r.congestion_level,
      congestionLabel: r.congestion_label,
      avgSpeed: r.avg_speed,
      volume: r.volume,
      timestamp: r.timestamp,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/traffic/zone/:zone
exports.getTrafficByZone = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const { rows } = await query(
      `SELECT * FROM traffic_records
       WHERE zone = $1 AND timestamp >= $2
       ORDER BY timestamp ASC`,
      [req.params.zone, since]
    );

    res.json({ success: true, data: rows.map(formatTrafficRecord) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/traffic/summary
exports.getTrafficSummary = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         zone AS "_id",
         AVG(congestion_level)  AS "avgCongestion",
         MAX(congestion_level)  AS "maxCongestion",
         AVG(avg_speed)         AS "avgSpeed",
         MAX(timestamp)         AS "latestTimestamp",
         (ARRAY_AGG(congestion_label ORDER BY timestamp DESC))[1] AS "congestionLabel"
       FROM traffic_records
       GROUP BY zone`
    );

    const data = rows.map(r => ({
      _id: r._id,
      avgCongestion: parseFloat(r.avgCongestion),
      maxCongestion: parseFloat(r.maxCongestion),
      avgSpeed: parseFloat(r.avgSpeed),
      latestTimestamp: r.latestTimestamp,
      congestionLabel: r.congestionLabel,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/traffic (add record)
exports.addTrafficRecord = async (req, res) => {
  try {
    const b = req.body;
    const loc = b.location || {};
    const congestionLabel = getCongestionLabel(b.congestionLevel);
    const { rows } = await query(
      `INSERT INTO traffic_records
        (zone, lat, lng, timestamp, congestion_level, congestion_label,
         avg_speed, volume, travel_time_index, event_id, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        b.zone, loc.lat || null, loc.lng || null,
        b.timestamp || new Date(), b.congestionLevel, congestionLabel,
        b.avgSpeed || 0, b.volume || 0, b.travelTimeIndex || 1,
        b.eventId || null, b.source || 'manual',
      ]
    );
    res.status(201).json({ success: true, data: formatTrafficRecord(rows[0]) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
