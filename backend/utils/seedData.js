/**
 * Seed Data — Bengaluru Edition
 * ============================================================
 * Events and alerts are derived from real incident patterns in the
 * Astram Bengaluru Traffic Dataset (8,205 records, 2023-2024).
 *
 * Corridors, zones, junctions, and coordinates are all authentic.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool, getCongestionLabel } = require('../config/db');
const { generatePrediction } = require('./mlPlaceholder');

// ─── Bengaluru Events ──────────────────────────────────────────────────────────
const EVENTS = [
  {
    name: 'Bengaluru Marathon 2026',
    type: 'sports',
    description: 'Annual Bengaluru marathon starting at M Visvesvaraya Industrial Area and passing through MG Road and Cubbon Park.',
    address: 'MG Road, Shanthala Nagar, Bengaluru, Karnataka',
    lat: 12.9750, lng: 77.6085,
    zone: 'Central Zone 1', radius: 1200,
    startDate: new Date('2026-06-21T06:00:00'),
    endDate:   new Date('2026-06-21T12:00:00'),
    expectedAttendance: 65000,
    organizer: 'Bengaluru Athletics Association',
    status: 'upcoming', severity: 'critical', isPlanned: true,
    affectedRoutes: ['MG Road', 'Residency Road', 'Cubbon Road', 'Queens Road'],
    tags: ['sports', 'marathon', 'road closure'],
    corridor: 'CBD 1', eventCause: 'public_event',
    requiresRoadClosure: true, priority: 'High', duration: 6,
  },
  {
    name: 'Chinnaswamy Stadium — IPL Playoff',
    type: 'sports',
    description: 'IPL playoff match at M Chinnaswamy Stadium. Heavy inflow expected on Queens Road and MG Road. BMTC extra services activated.',
    address: 'M Chinnaswamy Stadium, Queens Statue Circle, Bengaluru',
    lat: 12.9793, lng: 77.5996,
    zone: 'Central Zone 2', radius: 800,
    startDate: new Date('2026-06-22T18:30:00'),
    endDate:   new Date('2026-06-22T23:00:00'),
    expectedAttendance: 38000,
    organizer: 'Royal Challengers Bengaluru (BCCI)',
    status: 'upcoming', severity: 'high', isPlanned: true,
    affectedRoutes: ['Queens Road', 'MG Road', 'Vittal Mallya Road', 'Kasturba Road'],
    tags: ['sports', 'ipl', 'cricket'],
    corridor: 'CBD 2', eventCause: 'public_event',
    requiresRoadClosure: false, priority: 'High', duration: 5,
  },
  {
    name: 'ORR Metro Piling Work — Silk Board',
    type: 'construction',
    description: 'Metro Phase 3 piling work at Silk Board junction. One lane blocked city-to-ORR. High impact on Hosur Road and BTM Layout.',
    address: 'Silk Board Junction, BTM Layout, Bengaluru',
    lat: 12.9172, lng: 77.6220,
    zone: 'South Zone 1', radius: 600,
    startDate: new Date('2026-06-20T06:00:00'),
    endDate:   new Date('2026-07-20T22:00:00'),
    expectedAttendance: 0,
    organizer: 'BMRCL / BBMP',
    status: 'ongoing', severity: 'critical', isPlanned: true,
    affectedRoutes: ['Hosur Road', 'Bannerghatta Road', 'ORR', 'BTM Main Road'],
    tags: ['construction', 'metro', 'bmrcl'],
    corridor: 'Hosur Road', eventCause: 'construction',
    requiresRoadClosure: false, priority: 'High', duration: 720,
  },
  {
    name: 'Unplanned Vehicle Pile-Up — Hebbal Flyover',
    type: 'other',
    description: 'Multi-vehicle accident on Hebbal flyover. Heavy vehicles involved, road closure on city-bound lane.',
    address: 'Hebbal Flyover Junction, Bengaluru',
    lat: 13.0418, lng: 77.5947,
    zone: 'North Zone 1', radius: 500,
    startDate: new Date('2026-06-21T08:30:00'),
    endDate:   new Date('2026-06-21T13:00:00'),
    expectedAttendance: 0,
    organizer: 'Unknown',
    status: 'upcoming', severity: 'critical', isPlanned: false,
    affectedRoutes: ['Bellary Road', 'ORR North 1', 'MBT Road'],
    tags: ['accident', 'unplanned', 'road closure'],
    corridor: 'ORR North 1', eventCause: 'accident',
    requiresRoadClosure: true, priority: 'High', duration: 3,
  },
  {
    name: 'Dasara Procession — Cubbon Park',
    type: 'festival',
    description: 'Annual Mysuru Dasara procession relayed live at Cubbon Park. Massive crowds expected around MG Road, Brigade Road.',
    address: 'Cubbon Park, Kasturba Road, Bengaluru',
    lat: 12.9762, lng: 77.5929,
    zone: 'Central Zone 1', radius: 1500,
    startDate: new Date('2026-07-05T15:00:00'),
    endDate:   new Date('2026-07-05T22:00:00'),
    expectedAttendance: 90000,
    organizer: 'BBMP / Karnataka Government',
    status: 'upcoming', severity: 'critical', isPlanned: true,
    affectedRoutes: ['MG Road', 'Brigade Road', 'Residency Road', 'Kasturba Road', 'Queens Road'],
    tags: ['festival', 'dasara', 'cultural'],
    corridor: 'CBD 1', eventCause: 'public_event',
    requiresRoadClosure: true, priority: 'High', duration: 7,
  },
  {
    name: 'Whitefield BMTC Strike — IT Corridor Disruption',
    type: 'other',
    description: 'BMTC driver strike causing massive disruption in the IT corridor. Whitefield, Marathahalli, and Sarjapur Road severely affected.',
    address: 'Marathahalli Junction, Bengaluru',
    lat: 12.9694, lng: 77.7006,
    zone: 'East Zone 1', radius: 2000,
    startDate: new Date('2026-07-10T07:00:00'),
    endDate:   new Date('2026-07-10T20:00:00'),
    expectedAttendance: 0,
    organizer: 'BMTC Workers Union',
    status: 'upcoming', severity: 'high', isPlanned: false,
    affectedRoutes: ['ORR East 1', 'ORR East 2', 'Whitefield Road', 'Sarjapur Road'],
    tags: ['strike', 'bmtc', 'it corridor'],
    corridor: 'ORR East 1', eventCause: 'congestion',
    requiresRoadClosure: false, priority: 'High', duration: 13,
  },
];

// ─── Bengaluru Alerts ──────────────────────────────────────────────────────────
const ALERTS = [
  { type: 'high_congestion', severity: 'critical', title: 'Silk Board Junction — Gridlock', message: 'Silk Board Junction at standstill due to Metro piling work + IPL match overflow. All 4 directions blocked. Divert via Bannerghatta Road.', zone: 'South Zone 1' },
  { type: 'event_started',   severity: 'warning',  title: 'Chinnaswamy Match — Gates Open', message: 'M Chinnaswamy Stadium gates opened at 16:30. Heavy vehicle inflow on Queens Road and MG Road. BMTC extra buses activated.', zone: 'Central Zone 2' },
  { type: 'manpower_alert',  severity: 'warning',  title: 'Hebbal Flyover — Understaffed', message: 'Only 4 officers deployed at Hebbal Flyover. Minimum 14 required. Heavy vehicle accident blocking city-bound lane.', zone: 'North Zone 1' },
  { type: 'route_blocked',   severity: 'critical', title: 'Bellary Road Full Closure', message: 'Bellary Road closed from Hebbal to Mekhri Circle due to multi-vehicle accident. All traffic rerouted via Sankey Road.', zone: 'North Zone 1' },
  { type: 'unplanned_gathering', severity: 'critical', title: 'Water Logging — ORR East Underpass', message: 'Severe water logging at KR Puram underpass. Heavy vehicle movement blocked. IT corridor employees advised to use Outer PRR.', zone: 'East Zone 1' },
  { type: 'system', severity: 'info', title: 'Model Updated with Astram Dataset', message: 'AI prediction model retrained on 8,205 Bengaluru incidents (2023-2024). Accuracy improved to 89.4% for corridor-level impact prediction.', zone: null },
];

const BLR_ZONES = ['Central Zone 1', 'Central Zone 2', 'North Zone 1', 'South Zone 1', 'East Zone 1', 'West Zone 1'];

async function seed() {
  console.log('🌱 Seeding Bengaluru Flow4Ward database (Neon PostgreSQL)...');

  // Ensure columns are added
  await pool.query(`
    ALTER TABLE predictions 
    ADD COLUMN IF NOT EXISTS barricade_points JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS diversion_routes JSONB DEFAULT '[]'::jsonb
  `);

  // Clear all tables (order matters due to FK constraints)
  await pool.query('DELETE FROM predictions');
  await pool.query('DELETE FROM traffic_records');
  await pool.query('DELETE FROM alerts');
  await pool.query('DELETE FROM events');
  console.log('🗑️  Cleared existing data');

  // Seed events
  const savedEvents = [];
  for (const e of EVENTS) {
    const duration = e.duration || (e.startDate && e.endDate
      ? (new Date(e.endDate) - new Date(e.startDate)) / (1000 * 60 * 60)
      : 4);
    const { rows } = await pool.query(
      `INSERT INTO events
        (name, type, description, address, lat, lng, zone, radius,
         start_date, end_date, duration, expected_attendance, organizer,
         status, severity, is_planned, affected_routes, tags, corridor,
         event_cause, priority, requires_road_closure)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        e.name, e.type, e.description, e.address, e.lat, e.lng,
        e.zone, e.radius || 500, e.startDate, e.endDate, duration,
        e.expectedAttendance || 0, e.organizer || 'Unknown',
        e.status || 'upcoming', e.severity || 'medium', e.isPlanned !== false,
        JSON.stringify(e.affectedRoutes || []), JSON.stringify(e.tags || []),
        e.corridor || 'Non-corridor', e.eventCause || 'others',
        e.priority || 'Medium', e.requiresRoadClosure || false,
      ]
    );
    savedEvents.push(rows[0]);
  }
  console.log(`✅ Seeded ${savedEvents.length} Bengaluru events`);

  // Generate ML predictions for each event
  for (const event of savedEvents) {
    const predData = await generatePrediction({
      eventType:           event.type,
      eventCause:          event.event_cause,
      expectedAttendance:  event.expected_attendance,
      location:            { lat: event.lat, lng: event.lng, zone: event.zone, address: event.address },
      startDate:           event.start_date,
      endDate:             event.end_date,
      duration:            event.duration || 4,
      priority:            event.priority || 'High',
      requiresRoadClosure: event.requires_road_closure || false,
      corridor:            event.corridor || 'Non-corridor',
    });
    await pool.query(
      `INSERT INTO predictions
        (event_id, traffic_impact_score, impact_label, peak_congestion_time,
         estimated_duration, affected_area, timeline, junction_impact,
         resource_allocation, simulation, historical_insights, confidence,
         model_version, generated_by, barricade_points, diversion_routes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
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
  }
  console.log(`✅ Seeded ${savedEvents.length} AI predictions`);

  // Seed 25h of traffic records — batch INSERT for speed
  const now = new Date();
  const trafficRows = [];
  for (let h = 24; h >= 0; h--) {
    for (const zone of BLR_ZONES) {
      const t = new Date(now);
      t.setHours(t.getHours() - h);
      const hour = t.getHours();
      const isRush = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21);
      const baseCongestion = isRush ? 75 : 40;
      const zoneBoost = zone.includes('East') || zone.includes('Central') ? 10 : 0;
      const congestionLevel = Math.min(100, baseCongestion + zoneBoost + Math.floor(Math.random() * 18) - 8);
      trafficRows.push([zone, t, congestionLevel, getCongestionLabel(congestionLevel),
        Math.max(5, 55 - congestionLevel * 0.48), 900 + congestionLevel * 22]);
    }
  }
  // Build one big parameterized INSERT
  const cols = trafficRows.length;
  const placeholders = trafficRows.map((_, i) => {
    const base = i * 6;
    return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},'seed')`;
  }).join(',');
  const flatValues = trafficRows.flat();
  await pool.query(
    `INSERT INTO traffic_records (zone, timestamp, congestion_level, congestion_label, avg_speed, volume, source) VALUES ${placeholders}`,
    flatValues
  );
  console.log(`✅ Seeded ${cols} Bengaluru traffic records`);

  // Seed alerts
  for (const a of ALERTS) {
    const eventId = savedEvents[Math.floor(Math.random() * savedEvents.length)].id;
    const resolved = Math.random() > 0.6;
    await pool.query(
      `INSERT INTO alerts (type, severity, title, message, zone, event_id, resolved)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [a.type, a.severity, a.title, a.message, a.zone || null, eventId, resolved]
    );
  }
  console.log(`✅ Seeded ${ALERTS.length} Bengaluru alerts`);

  console.log('🎉 Bengaluru database seeded successfully!');
  console.log('📍 City: Bengaluru, Karnataka, India');
  console.log('📊 Dataset: Astram Bengaluru Incident Data (8,205 records, 2023-2024)');
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
