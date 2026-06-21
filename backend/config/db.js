const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
  // Ensure barricade_points and diversion_routes columns exist
  pool.query(`
    ALTER TABLE predictions 
    ADD COLUMN IF NOT EXISTS barricade_points JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS diversion_routes JSONB DEFAULT '[]'::jsonb
  `).catch(err => {
    console.error('❌ Failed to run predictions columns migration:', err.message);
  });
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Helper: run a query and return rows
const query = (text, params) => pool.query(text, params);

// Helper: format a row to match the old Mongoose shape (_id alias, camelCase)
const formatEvent = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    location: {
      address: row.address,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      zone: row.zone,
      radius: row.radius,
    },
    startDate: row.start_date,
    endDate: row.end_date,
    duration: row.duration,
    expectedAttendance: row.expected_attendance,
    organizer: row.organizer,
    status: row.status,
    severity: row.severity,
    isPlanned: row.is_planned,
    affectedRoutes: row.affected_routes || [],
    tags: row.tags || [],
    corridor: row.corridor,
    eventCause: row.event_cause,
    priority: row.priority,
    requiresRoadClosure: row.requires_road_closure,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const formatAlert = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    zone: row.zone,
    location: { lat: row.lat, lng: row.lng },
    eventId: row.event_id ? { _id: row.event_id, id: row.event_id, name: row.event_name, type: row.event_type } : null,
    resolved: row.resolved,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    actions: row.actions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const formatTrafficRecord = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    zone: row.zone,
    location: { lat: row.lat, lng: row.lng },
    timestamp: row.timestamp,
    congestionLevel: row.congestion_level,
    congestionLabel: row.congestion_label,
    avgSpeed: row.avg_speed,
    volume: row.volume,
    travelTimeIndex: row.travel_time_index,
    eventId: row.event_id,
    source: row.source,
    createdAt: row.created_at,
  };
};

const formatPrediction = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    eventId: row.event_id,
    trafficImpactScore: row.traffic_impact_score,
    impactLabel: row.impact_label,
    peakCongestionTime: row.peak_congestion_time,
    estimatedDuration: row.estimated_duration,
    affectedArea: row.affected_area,
    timeline: row.timeline || [],
    junctionImpact: row.junction_impact || [],
    resourceAllocation: row.resource_allocation || [],
    resourceOverriddenAt: row.resource_overridden_at,
    resourceOverriddenBy: row.resource_overridden_by,
    simulation: row.simulation,
    historicalInsights: row.historical_insights,
    confidence: row.confidence,
    modelVersion: row.model_version,
    generatedBy: row.generated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    barricadePoints: row.barricade_points || [],
    diversionRoutes: row.diversion_routes || [],
  };
};

// Compute congestion label from level
const getCongestionLabel = (level) => {
  if (level < 20) return 'free';
  if (level < 40) return 'light';
  if (level < 60) return 'moderate';
  if (level < 80) return 'heavy';
  return 'standstill';
};

module.exports = { pool, query, formatEvent, formatAlert, formatTrafficRecord, formatPrediction, getCongestionLabel };
