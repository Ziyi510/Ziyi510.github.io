-- Tables for the visitor counter (src/index.mjs). Apply with
--   npx wrangler d1 execute ziyi510-visitors --remote --command "$(cat schema.sql)"

-- one row per place: city-level coordinates from Cloudflare, visits, last visit (ms)
CREATE TABLE IF NOT EXISTS places (
  key  TEXT PRIMARY KEY,          -- "country|city|lat|lon"
  city TEXT NOT NULL,
  cc   TEXT NOT NULL,             -- ISO country code, XX if unknown
  lat  REAL,
  lon  REAL,
  n    INTEGER NOT NULL DEFAULT 0,
  last INTEGER NOT NULL
);

-- Running totals: accepted visits; historical counts are preserved.
CREATE TABLE IF NOT EXISTS totals (
  name TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO totals (name, n) VALUES ('pageviews', 0);

-- Temporary HMAC digests; ignored refreshes do not extend last_counted.
CREATE TABLE IF NOT EXISTS visit_dedupe (
  ip_hash TEXT PRIMARY KEY,
  last_counted INTEGER NOT NULL,
  event_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visit_dedupe_expiry ON visit_dedupe (last_counted);
