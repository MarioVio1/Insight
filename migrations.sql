-- ============================================
-- InsightBoard – Schema Supabase v1.1
-- ============================================

-- Utenti
CREATE TABLE IF NOT EXISTS ib_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  tmdb_key        TEXT,
  trakt_token     TEXT,
  trakt_refresh   TEXT,
  trakt_expires   BIGINT,
  trakt_username  TEXT,
  webhook_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Profili per utente (Profile Splitter)
CREATE TABLE IF NOT EXISTS ib_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES ib_users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '🎬',
  color       TEXT DEFAULT '#01696f',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Storico visualizzazioni
CREATE TABLE IF NOT EXISTS ib_watch_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES ib_users(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES ib_profiles(id) ON DELETE SET NULL,
  tmdb_id     TEXT,
  imdb_id     TEXT,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('movie','episode')),
  season      INTEGER,
  episode     INTEGER,
  watched_at  TIMESTAMPTZ,
  source      TEXT DEFAULT 'trakt',
  runtime_min INTEGER,
  progress    INTEGER DEFAULT 100,
  genres      TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indici performance
CREATE INDEX IF NOT EXISTS idx_watch_events_user ON ib_watch_events(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_profile ON ib_watch_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_watched_at ON ib_watch_events(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_events_type ON ib_watch_events(type);
CREATE INDEX IF NOT EXISTS idx_watch_events_title ON ib_watch_events(title);

-- Cache analytics
CREATE TABLE IF NOT EXISTS ib_insights_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES ib_users(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES ib_profiles(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  period_days INTEGER DEFAULT 30,
  payload     JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, profile_id, key, period_days)
);

-- Obiettivi settimanali
CREATE TABLE IF NOT EXISTS ib_goals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES ib_users(id) ON DELETE CASCADE,
  profile_id          UUID REFERENCES ib_profiles(id) ON DELETE CASCADE,
  weekly_hours_goal   INTEGER DEFAULT 10,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- Row Level Security (opzionale, consigliato per produzione)
ALTER TABLE ib_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ib_goals ENABLE ROW LEVEL SECURITY;

-- Policy: consenti tutto al service_role (usato dal backend)
CREATE POLICY "service_role_all_users" ON ib_users FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_profiles" ON ib_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_events" ON ib_watch_events FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_cache" ON ib_insights_cache FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_goals" ON ib_goals FOR ALL TO service_role USING (true);
