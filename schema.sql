-- ============================================================================
-- IMAN App - PostgreSQL Schema
-- ============================================================================
-- Execute this in Supabase SQL Editor after creating project
-- ============================================================================

-- Users table - stores all user data as JSONB
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Analytics table - tracks user activity
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  page TEXT,
  action TEXT,
  metadata JSONB,
  timestamp BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_telegram_id ON analytics(telegram_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Enable Row Level Security (optional, for extra security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Create policy: allow all operations (since auth is handled by app)
-- In production, you might want more restrictive policies
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on analytics" ON analytics FOR ALL USING (true);

-- ============================================================================
-- Verification queries (run after schema creation)
-- ============================================================================

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'analytics');

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'analytics');

-- ============================================================================
-- Sample data (optional, for testing)
-- ============================================================================

-- Insert test user (you can delete this after testing)
-- INSERT INTO users (telegram_id, data, updated_at)
-- VALUES (
--   123456789,
--   '{"name": "Test User", "totalPoints": 0, "level": "Талиб", "streak": 0}'::jsonb,
--   EXTRACT(EPOCH FROM NOW())::bigint
-- );

-- ============================================================================
-- Useful queries for monitoring
-- ============================================================================

-- Count users
-- SELECT COUNT(*) as total_users FROM users;

-- Count analytics events
-- SELECT COUNT(*) as total_events FROM analytics;

-- Recent activity
-- SELECT * FROM analytics ORDER BY timestamp DESC LIMIT 10;

-- User activity summary
-- SELECT
--   telegram_id,
--   COUNT(*) as events,
--   MAX(timestamp) as last_activity
-- FROM analytics
-- GROUP BY telegram_id
-- ORDER BY events DESC;
