-- ============================================================
-- CoverGrab Database Schema
-- ============================================================
-- This file documents the full database schema for CoverGrab.
-- Run these in your Supabase SQL Editor to set up the database.
-- ============================================================

-- ============================================
-- Events Table (Phase 2)
-- ============================================
-- Stores all analytics events from the frontend
-- This is an append-only table for raw event data

CREATE TABLE IF NOT EXISTS events (
  id                BIGSERIAL PRIMARY KEY,
  event_type        TEXT NOT NULL,
  ts                TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- server received time
  client_time       TIMESTAMPTZ NULL,                      -- client-side timestamp
  anonymous_user_id TEXT NOT NULL,
  session_id        TEXT NOT NULL,
  ip_hash           TEXT NOT NULL,
  country           TEXT NULL,                             -- 2-letter ISO country code
  page              TEXT NOT NULL,
  referer           TEXT NULL,
  user_agent        TEXT NULL,
  extra_json        JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Comments
COMMENT ON TABLE events IS 'Raw analytics events from CoverGrab frontend';
COMMENT ON COLUMN events.event_type IS 'Type of event: page_view, cover_success, download, cta_bmc, cta_leave, bad_url, invalid_domain, invalid_video_id, no_thumbnail, support_stripe_click, support_external_click';
COMMENT ON COLUMN events.ts IS 'Server-side timestamp when event was received (UTC)';
COMMENT ON COLUMN events.client_time IS 'Client-side timestamp when event occurred';
COMMENT ON COLUMN events.anonymous_user_id IS 'Unique ID per browser (persists across sessions)';
COMMENT ON COLUMN events.session_id IS 'Unique ID per tab/session';
COMMENT ON COLUMN events.ip_hash IS 'SHA-256 hash of client IP (for unique counting without storing raw IP)';
COMMENT ON COLUMN events.country IS 'ISO 3166-1 alpha-2 country code from GeoIP';

-- Events Indexes
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type_ts ON events (event_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_session_id_ts ON events (session_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_anonymous_user_id_ts ON events (anonymous_user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_country_ts ON events (country, ts DESC);


-- ============================================
-- Payments Table (Phase 5)
-- ============================================
-- Stores all successful payments from Stripe

CREATE TABLE IF NOT EXISTS payments (
  id                BIGSERIAL PRIMARY KEY,
  provider          TEXT NOT NULL,            -- 'stripe' | 'external' | etc.
  provider_payment_id TEXT NOT NULL,          -- Stripe session/payment ID
  amount_cents      BIGINT NOT NULL,          -- integer amount in cents
  currency          TEXT NOT NULL,            -- 'usd', 'eur', etc.
  status            TEXT NOT NULL,            -- 'succeeded', 'pending', 'failed', 'refunded'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anonymous_user_id TEXT NULL,                -- Optional link back to analytics identity
  session_id        TEXT NULL,
  raw_metadata      JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Comments
COMMENT ON TABLE payments IS 'Payment records from Stripe and other providers';
COMMENT ON COLUMN payments.provider IS 'Payment provider (stripe, external, etc.)';
COMMENT ON COLUMN payments.provider_payment_id IS 'Unique ID from the payment provider';
COMMENT ON COLUMN payments.amount_cents IS 'Payment amount in cents (e.g., 500 = $5.00)';

-- Payments Indexes
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments (provider, status);


-- ============================================
-- Security Events Table (Phase 6)
-- ============================================
-- Logs security-related events for monitoring and abuse detection

CREATE TABLE IF NOT EXISTS security_events (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level       TEXT NOT NULL,          -- 'INFO', 'WARN', 'ALERT'
  source      TEXT NOT NULL,          -- e.g. 'admin-login', 'event', 'stripe-webhook'
  type        TEXT NOT NULL,          -- e.g. 'failed_login', 'rate_limited', 'invalid_webhook', 'blocked_ip'
  ip_hash     TEXT NULL,
  country     TEXT NULL,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Comments
COMMENT ON TABLE security_events IS 'Security event log for monitoring and abuse detection';
COMMENT ON COLUMN security_events.level IS 'Severity: INFO (normal), WARN (suspicious), ALERT (critical)';
COMMENT ON COLUMN security_events.source IS 'Which function/endpoint generated this event';
COMMENT ON COLUMN security_events.type IS 'Type of security event (failed_login, rate_limited, blocked_ip, etc.)';

-- Security Events Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_ts ON security_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type_ts ON security_events (type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_source_ts ON security_events (source, ts DESC);


-- ============================================
-- Blocked IPs Table (Phase 6)
-- ============================================
-- Stores blocked IP hashes for abuse prevention

CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_hash     TEXT PRIMARY KEY,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NULL         -- null = permanent block
);

-- Comments
COMMENT ON TABLE blocked_ips IS 'Blocked IP addresses (hashed) for abuse prevention';
COMMENT ON COLUMN blocked_ips.expires_at IS 'When the block expires (NULL = permanent)';

-- Blocked IPs Indexes
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON blocked_ips (expires_at);


-- ============================================
-- Row Level Security (Optional)
-- ============================================
-- Enable RLS for additional security if needed

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (these policies are permissive for server-side access)
CREATE POLICY "Service role full access on events" ON events FOR ALL USING (true);
CREATE POLICY "Service role full access on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Service role full access on security_events" ON security_events FOR ALL USING (true);
CREATE POLICY "Service role full access on blocked_ips" ON blocked_ips FOR ALL USING (true);


-- ============================================
-- Sample Queries for Testing/Verification
-- ============================================

-- Count events by type
-- SELECT event_type, COUNT(*) FROM events GROUP BY event_type ORDER BY COUNT(*) DESC;

-- Check security events
-- SELECT * FROM security_events ORDER BY ts DESC LIMIT 20;

-- Check blocked IPs
-- SELECT * FROM blocked_ips WHERE expires_at IS NULL OR expires_at > NOW();

-- Payment totals
-- SELECT COUNT(*), SUM(amount_cents) FROM payments WHERE status = 'succeeded';

-- Security event summary (last 7 days)
-- SELECT type, COUNT(*) FROM security_events
-- WHERE ts > NOW() - INTERVAL '7 days'
-- GROUP BY type ORDER BY COUNT(*) DESC;
