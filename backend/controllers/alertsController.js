const { query, formatAlert } = require('../config/db');

// GET /api/alerts
exports.getAlerts = async (req, res) => {
  try {
    const { resolved, severity, limit = 50 } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;
    if (resolved !== undefined) { conditions.push(`a.resolved = $${i++}`); values.push(resolved === 'true'); }
    if (severity)               { conditions.push(`a.severity = $${i++}`); values.push(severity); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT a.*, e.name AS event_name, e.type AS event_type
       FROM alerts a
       LEFT JOIN events e ON a.event_id = e.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${i}`,
      [...values, parseInt(limit)]
    );

    res.json({ success: true, data: rows.map(formatAlert) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/alerts
exports.createAlert = async (req, res) => {
  try {
    const b = req.body;
    const loc = b.location || {};
    const { rows } = await query(
      `INSERT INTO alerts (type, severity, title, message, zone, lat, lng, event_id, actions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.type, b.severity || 'info', b.title, b.message,
        b.zone || null, loc.lat || null, loc.lng || null,
        b.eventId || null, JSON.stringify(b.actions || []),
      ]
    );
    const alert = formatAlert(rows[0]);
    const io = req.app.get('io');
    if (io) io.emit('new_alert', alert);
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/alerts/:id/resolve
exports.resolveAlert = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE alerts
       SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.body.resolvedBy || 'System', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Alert not found' });
    const alert = formatAlert(rows[0]);
    const io = req.app.get('io');
    if (io) io.emit('alert_resolved', { id: alert._id });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/alerts/stats
exports.getAlertStats = async (req, res) => {
  try {
    const [totalRes, unresolvedRes, criticalRes, bySeverityRes] = await Promise.all([
      query('SELECT COUNT(*) FROM alerts'),
      query('SELECT COUNT(*) FROM alerts WHERE resolved = FALSE'),
      query("SELECT COUNT(*) FROM alerts WHERE severity = 'critical' AND resolved = FALSE"),
      query('SELECT severity AS _id, COUNT(*) AS count FROM alerts GROUP BY severity'),
    ]);

    res.json({
      success: true,
      data: {
        total:      parseInt(totalRes.rows[0].count),
        unresolved: parseInt(unresolvedRes.rows[0].count),
        critical:   parseInt(criticalRes.rows[0].count),
        bySeverity: bySeverityRes.rows.map(r => ({ _id: r._id, count: parseInt(r.count) })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
