-- Flow4Ward — Neon PostgreSQL Schema
-- Run this ONCE in the Neon SQL Editor before deploying

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL,
  description      TEXT DEFAULT '',
  address          TEXT NOT NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  zone             TEXT NOT NULL,
  radius           INTEGER DEFAULT 500,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  duration         DOUBLE PRECISION,
  expected_attendance INTEGER DEFAULT 0,
  organizer        TEXT DEFAULT 'Unknown',
  status           TEXT DEFAULT 'upcoming',
  severity         TEXT DEFAULT 'medium',
  is_planned       BOOLEAN DEFAULT TRUE,
  affected_routes  JSONB DEFAULT '[]',
  tags             JSONB DEFAULT '[]',
  corridor         TEXT DEFAULT 'Non-corridor',
  event_cause      TEXT DEFAULT 'others',
  priority         TEXT DEFAULT 'Medium',
  requires_road_closure BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Traffic Records ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS traffic_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone             TEXT NOT NULL,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  congestion_level INTEGER NOT NULL CHECK (congestion_level >= 0 AND congestion_level <= 100),
  congestion_label TEXT DEFAULT 'free',
  avg_speed        DOUBLE PRECISION DEFAULT 0,
  volume           INTEGER DEFAULT 0,
  travel_time_index DOUBLE PRECISION DEFAULT 1,
  event_id         UUID REFERENCES events(id) ON DELETE SET NULL,
  source           TEXT DEFAULT 'seed',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL,
  severity         TEXT DEFAULT 'info',
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  zone             TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  event_id         UUID REFERENCES events(id) ON DELETE SET NULL,
  resolved         BOOLEAN DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT,
  actions          JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Predictions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id               UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  traffic_impact_score   INTEGER NOT NULL,
  impact_label           TEXT DEFAULT 'moderate',
  peak_congestion_time   TIMESTAMPTZ,
  estimated_duration     DOUBLE PRECISION,
  affected_area          DOUBLE PRECISION,
  timeline               JSONB DEFAULT '[]',
  junction_impact        JSONB DEFAULT '[]',
  resource_allocation    JSONB DEFAULT '[]',
  resource_overridden_at TIMESTAMPTZ,
  resource_overridden_by TEXT,
  simulation             JSONB,
  historical_insights    JSONB,
  confidence             DOUBLE PRECISION DEFAULT 0.85,
  model_version          TEXT DEFAULT 'stub-v1.0',
  generated_by           TEXT DEFAULT 'stub',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_zone_ts ON traffic_records(zone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_event ON predictions(event_id);
