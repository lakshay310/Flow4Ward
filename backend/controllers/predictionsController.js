const { query, formatPrediction, formatEvent } = require('../config/db');
const {
  generatePrediction, simulateIntervention,
  computeImpactScore, generateJunctionImpact,
} = require('../utils/mlPlaceholder');

// GET /api/predictions/event/:eventId
exports.getPredictionByEvent = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM predictions WHERE event_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.eventId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No prediction found' });
    res.json({ success: true, data: formatPrediction(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/predictions/generate
exports.generatePredictionForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const evRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!evRes.rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    const event = evRes.rows[0];

    const predData = await generatePrediction({
      eventType: event.type,
      eventCause: event.event_cause,
      expectedAttendance: event.expected_attendance,
      location: { lat: event.lat, lng: event.lng, zone: event.zone, address: event.address },
      startDate: event.start_date,
      endDate: event.end_date,
      duration: event.duration || 4,
      priority: event.priority,
      requiresRoadClosure: event.requires_road_closure,
      corridor: event.corridor,
    });

    // Upsert prediction (INSERT or UPDATE if event_id already exists)
    const { rows } = await query(
      `INSERT INTO predictions
        (event_id, traffic_impact_score, impact_label, peak_congestion_time,
         estimated_duration, affected_area, timeline, junction_impact,
         resource_allocation, simulation, historical_insights, confidence,
         model_version, generated_by, barricade_points, diversion_routes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
       ON CONFLICT (event_id) DO UPDATE SET
         traffic_impact_score = EXCLUDED.traffic_impact_score,
         impact_label         = EXCLUDED.impact_label,
         peak_congestion_time = EXCLUDED.peak_congestion_time,
         estimated_duration   = EXCLUDED.estimated_duration,
         affected_area        = EXCLUDED.affected_area,
         timeline             = EXCLUDED.timeline,
         junction_impact      = EXCLUDED.junction_impact,
         resource_allocation  = EXCLUDED.resource_allocation,
         simulation           = EXCLUDED.simulation,
         historical_insights  = EXCLUDED.historical_insights,
         confidence           = EXCLUDED.confidence,
         model_version        = EXCLUDED.model_version,
         generated_by         = EXCLUDED.generated_by,
         barricade_points     = EXCLUDED.barricade_points,
         diversion_routes     = EXCLUDED.diversion_routes,
         updated_at           = NOW()
       RETURNING *`,
      [
        eventId, predData.trafficImpactScore, predData.impactLabel,
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

    res.json({ success: true, data: formatPrediction(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/predictions/simulate
exports.simulateIntervention = async (req, res) => {
  try {
    const {
      eventId, expectedAttendance, duration, officersCount,
      barricadesCount, diversionActive, eventType, eventCause,
      corridor, locationName,
    } = req.body;

    const evRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (!evRes.rows.length) return res.status(404).json({ success: false, message: 'Event not found' });
    const event = evRes.rows[0];

    const predRes = await query('SELECT * FROM predictions WHERE event_id = $1', [eventId]);
    if (!predRes.rows.length) return res.status(404).json({ success: false, message: 'No prediction found for event' });
    const prediction = predRes.rows[0];

    const simEventCause       = eventCause !== undefined ? eventCause : (event.event_cause || 'others');
    const simExpectedAttendance = expectedAttendance !== undefined ? parseInt(expectedAttendance, 10) : (event.expected_attendance || 0);
    const simDuration         = duration !== undefined ? parseFloat(duration) : (event.duration || 4);
    let simLat                = event.lat;
    let simLng                = event.lng;
    let simCorridor           = corridor !== undefined ? corridor : (event.corridor || 'Non-corridor');

    // If custom location selected, lookup matching event
    if (locationName && locationName !== event.address) {
      const matchRes = await query('SELECT * FROM events WHERE address = $1 LIMIT 1', [locationName]);
      if (matchRes.rows.length) {
        simLat = matchRes.rows[0].lat;
        simLng = matchRes.rows[0].lng;
        if (corridor === undefined) simCorridor = matchRes.rows[0].corridor || 'Non-corridor';
      }
    }

    let impactScore = prediction.traffic_impact_score;
    let junctions   = prediction.junction_impact || [];

    if (
      eventCause !== undefined || expectedAttendance !== undefined ||
      duration !== undefined   || eventType !== undefined          ||
      corridor !== undefined   || (locationName !== undefined && locationName !== event.address)
    ) {
      impactScore = computeImpactScore({
        eventCause: simEventCause,
        expectedAttendance: simExpectedAttendance,
        duration: simDuration,
        priority: event.priority || 'Medium',
        requiresRoadClosure: event.requires_road_closure || false,
        startDate: event.start_date,
        corridor: simCorridor,
      });
      junctions = generateJunctionImpact(simLat, simLng, impactScore, simCorridor);
    }

    const simulation = simulateIntervention(impactScore, junctions, officersCount, barricadesCount, diversionActive);
    res.json({ success: true, data: simulation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/predictions
exports.getAllPredictions = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, e.name AS event_name, e.type AS event_type,
              e.status AS event_status, e.severity AS event_severity,
              e.address AS event_address, e.zone AS event_zone,
              e.lat AS event_lat, e.lng AS event_lng
       FROM predictions p
       LEFT JOIN events e ON p.event_id = e.id
       ORDER BY p.created_at DESC
       LIMIT 20`
    );

    const data = rows.map(row => ({
      ...formatPrediction(row),
      eventId: row.event_id ? {
        _id: row.event_id,
        id: row.event_id,
        name: row.event_name,
        type: row.event_type,
        status: row.event_status,
        severity: row.event_severity,
        location: { address: row.event_address, zone: row.event_zone, lat: row.event_lat, lng: row.event_lng },
      } : null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/predictions/:id/resources
exports.updateResources = async (req, res) => {
  try {
    const { resourceAllocation } = req.body;
    if (!Array.isArray(resourceAllocation)) {
      return res.status(400).json({ success: false, message: 'resourceAllocation must be an array' });
    }
    const { rows } = await query(
      `UPDATE predictions
       SET resource_allocation = $1,
           resource_overridden_at = NOW(),
           resource_overridden_by = 'operator',
           updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(resourceAllocation), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: formatPrediction(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
