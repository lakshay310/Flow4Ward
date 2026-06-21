const { query, formatEvent, formatPrediction, formatAlert } = require('../config/db');
const { generatePrediction } = require('../utils/mlPlaceholder');

// Helper to auto-update event statuses based on current timestamp
const autoUpdateStatuses = async () => {
  try {
    // 1. Move upcoming/ongoing to completed if end_date has passed
    await query(`
      UPDATE events
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('upcoming', 'ongoing') AND end_date <= NOW()
    `);
    
    // 2. Move upcoming to ongoing if start_date has arrived and end_date has not passed
    await query(`
      UPDATE events
      SET status = 'ongoing', updated_at = NOW()
      WHERE status = 'upcoming' AND start_date <= NOW() AND end_date > NOW()
    `);
  } catch (err) {
    console.error('Error auto-updating event statuses:', err.message);
  }
};

// Helper to get historical resource experience of similar events
const getHistoricalExperience = async (eventCause, eventId) => {
  const defaultBaselines = {
    public_event:      { officers: 10, barricades: 10 },
    accident:          { officers: 12, barricades: 6 },
    congestion:        { officers: 10, barricades: 5 },
    construction:      { officers: 15, barricades: 6 },
    tree_fall:         { officers: 12, barricades: 4 },
    water_logging:     { officers: 18, barricades: 5 },
    vehicle_breakdown: { officers: 10, barricades: 2 },
    pot_holes:         { officers: 6,  barricades: 2 },
    road_conditions:   { officers: 8,  barricades: 3 },
    others:            { officers: 15, barricades: 4 },
  };

  const base = defaultBaselines[eventCause] || defaultBaselines.others;

  try {
    const { rows } = await query(`
      SELECT 
        e.id,
        e.name,
        e.start_date,
        p.resource_allocation,
        p.barricade_points
      FROM predictions p
      JOIN events e ON p.event_id = e.id
      WHERE e.event_cause = $1 AND e.id != $2
      ORDER BY e.start_date DESC
      LIMIT 5
    `, [eventCause, eventId || '00000000-0000-0000-0000-000000000000']);

    if (!rows || rows.length === 0) {
      return {
        avgOfficers: base.officers,
        avgBarricades: base.barricades,
        pastEventsCount: 0,
        pastEvents: [],
      };
    }

    let totalOfficers = 0;
    let totalBarricades = 0;
    const pastEvents = [];

    rows.forEach(r => {
      let officers = 0;
      let barricades = 0;
      if (Array.isArray(r.resource_allocation)) {
        r.resource_allocation.forEach(alloc => {
          officers += parseInt(alloc.officersAssigned) || 0;
        });
      }
      if (Array.isArray(r.barricade_points)) {
        barricades = r.barricade_points.length;
      } else if (Array.isArray(r.resource_allocation)) {
        barricades = r.resource_allocation.filter(a => (a.barricades || 0) > 0).length || 5;
      } else {
        barricades = base.barricades;
      }
      totalOfficers += officers;
      totalBarricades += barricades;
      pastEvents.push({
        id: r.id,
        name: r.name,
        date: r.start_date,
        officers,
        barricades,
      });
    });

    const count = rows.length;
    return {
      avgOfficers: Math.round(totalOfficers / count) || base.officers,
      avgBarricades: Math.round(totalBarricades / count) || base.barricades,
      pastEventsCount: count,
      pastEvents,
    };
  } catch (err) {
    console.error('Error fetching historical experience:', err.message);
    return {
      avgOfficers: base.officers,
      avgBarricades: base.barricades,
      pastEventsCount: 0,
      pastEvents: [],
    };
  }
};

// GET /api/events
exports.getEvents = async (req, res) => {
  try {
    await autoUpdateStatuses();
    const { type, status, severity, limit = 50, page = 1 } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;
    if (type)     { conditions.push(`type = $${i++}`);     values.push(type); }
    if (status)   { conditions.push(`status = $${i++}`);   values.push(status); }
    if (severity) { conditions.push(`severity = $${i++}`); values.push(severity); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRes = await query(`SELECT COUNT(*) FROM events ${where}`, values);
    const total = parseInt(countRes.rows[0].count);

    const eventsRes = await query(
      `SELECT * FROM events ${where} ORDER BY start_date DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, parseInt(limit), offset]
    );

    res.json({ success: true, data: eventsRes.rows.map(formatEvent), total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/events/:id
exports.getEvent = async (req, res) => {
  try {
    await autoUpdateStatuses();
    const { rows } = await query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    
    const event = formatEvent(rows[0]);
    const histExp = await getHistoricalExperience(event.eventCause, event.id);
    
    res.json({ 
      success: true, 
      data: {
        ...event,
        historicalExperience: histExp
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const b = req.body;
    const loc = b.location || {};
    const duration = b.startDate && b.endDate
      ? (new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60)
      : (b.duration || null);

    const { rows } = await query(
      `INSERT INTO events
        (name, type, description, address, lat, lng, zone, radius,
         start_date, end_date, duration, expected_attendance, organizer,
         status, severity, is_planned, affected_routes, tags, corridor,
         event_cause, priority, requires_road_closure)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        b.name, b.type, b.description || '', loc.address, loc.lat, loc.lng,
        loc.zone, loc.radius || 500, b.startDate, b.endDate, duration,
        b.expectedAttendance || 0, b.organizer || 'Unknown',
        b.status || 'upcoming', b.severity || 'medium', b.isPlanned !== false,
        JSON.stringify(b.affectedRoutes || []), JSON.stringify(b.tags || []),
        b.corridor || 'Non-corridor', b.eventCause || 'others',
        b.priority || 'Medium', b.requiresRoadClosure || false,
      ]
    );
    const event = formatEvent(rows[0]);

    // Auto-generate prediction
    const predData = await generatePrediction({
      eventType: event.type,
      eventCause: event.eventCause,
      expectedAttendance: event.expectedAttendance,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      duration: event.duration || 4,
      priority: event.priority,
      requiresRoadClosure: event.requiresRoadClosure,
      corridor: event.corridor,
    });

    const predRes = await query(
      `INSERT INTO predictions
        (event_id, traffic_impact_score, impact_label, peak_congestion_time,
         estimated_duration, affected_area, timeline, junction_impact,
         resource_allocation, simulation, historical_insights, confidence,
         model_version, generated_by, barricade_points, diversion_routes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        event.id, predData.trafficImpactScore, predData.impactLabel,
        predData.peakCongestionTime, predData.estimatedDuration, predData.affectedArea,
        JSON.stringify(predData.timeline || []),
        JSON.stringify(predData.junctionImpact || []),
        JSON.stringify(predData.resourceAllocation || []),
        JSON.stringify(predData.simulation || null),
        JSON.stringify(predData.historicalInsights || null),
        predData.confidence || 0.85, predData.modelVersion || 'stub-v1.0',
        predData.generatedBy || 'stub',
        JSON.stringify(predData.barricadePoints || []),
        JSON.stringify(predData.diversionRoutes || []),
      ]
    );
    const prediction = formatPrediction(predRes.rows[0]);

    // Auto-create alert for high/critical severity
    if (['high', 'critical'].includes(event.severity)) {
      const alertRes = await query(
        `INSERT INTO alerts (type, severity, title, message, zone, event_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          'event_started',
          event.severity === 'critical' ? 'critical' : 'warning',
          `New Event: ${event.name}`,
          `Event "${event.name}" created in ${event.location.zone}. Impact score: ${prediction.trafficImpactScore}`,
          event.location.zone, event.id,
        ]
      );
      const io = req.app.get('io');
      if (io) io.emit('new_alert', formatAlert(alertRes.rows[0]));
    }

    res.status(201).json({ success: true, data: event, prediction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res) => {
  try {
    const b = req.body;
    const loc = b.location || {};
    const { rows } = await query(
      `UPDATE events SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        description = COALESCE($3, description),
        address = COALESCE($4, address),
        lat = COALESCE($5, lat),
        lng = COALESCE($6, lng),
        zone = COALESCE($7, zone),
        radius = COALESCE($8, radius),
        start_date = COALESCE($9, start_date),
        end_date = COALESCE($10, end_date),
        expected_attendance = COALESCE($11, expected_attendance),
        organizer = COALESCE($12, organizer),
        status = COALESCE($13, status),
        severity = COALESCE($14, severity),
        corridor = COALESCE($15, corridor),
        event_cause = COALESCE($16, event_cause),
        priority = COALESCE($17, priority),
        updated_at = NOW()
       WHERE id = $18 RETURNING *`,
      [
        b.name || null, b.type || null, b.description || null,
        loc.address || null, loc.lat || null, loc.lng || null,
        loc.zone || null, loc.radius || null,
        b.startDate || null, b.endDate || null,
        b.expectedAttendance != null ? b.expectedAttendance : null,
        b.organizer || null, b.status || null, b.severity || null,
        b.corridor || null, b.eventCause || null, b.priority || null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: formatEvent(rows[0]) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    // Predictions deleted via CASCADE; traffic_records & alerts have SET NULL
    const { rows } = await query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/events/stats
exports.getStats = async (req, res) => {
  try {
    await autoUpdateStatuses();
    const [totalRes, upcomingRes, ongoingRes, criticalRes, byTypeRes, bySeverityRes] = await Promise.all([
      query('SELECT COUNT(*) FROM events'),
      query("SELECT COUNT(*) FROM events WHERE status = 'upcoming'"),
      query("SELECT COUNT(*) FROM events WHERE status = 'ongoing'"),
      query("SELECT COUNT(*) FROM events WHERE severity = 'critical'"),
      query('SELECT type AS _id, COUNT(*) AS count FROM events GROUP BY type'),
      query('SELECT severity AS _id, COUNT(*) AS count FROM events GROUP BY severity'),
    ]);

    res.json({
      success: true,
      data: {
        total:    parseInt(totalRes.rows[0].count),
        upcoming: parseInt(upcomingRes.rows[0].count),
        ongoing:  parseInt(ongoingRes.rows[0].count),
        critical: parseInt(criticalRes.rows[0].count),
        byType:   byTypeRes.rows.map(r => ({ _id: r._id, count: parseInt(r.count) })),
        bySeverity: bySeverityRes.rows.map(r => ({ _id: r._id, count: parseInt(r.count) })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
