-- ============================================================
-- INIT: Adaptive Insights - Drop & Recreate custom tables
-- Esegui UNA SOLA volta nel Supabase SQL Editor
-- ============================================================

-- 1. Drop tutte le tabelle custom (ordine FK)
drop table if exists user_profiles cascade;
drop table if exists adaptive_meta cascade;
drop table if exists adaptive_rows cascade;
drop table if exists insight_snapshots cascade;
drop table if exists config_preferences cascade;
drop table if exists trakt_events cascade;

-- 2. Aggiunge colonne a addon_configs (se mancano)
alter table addon_configs add column if not exists slug text;
create unique index if not exists idx_addon_configs_slug on addon_configs(slug) where slug is not null;
create unique index if not exists idx_addon_configs_trakt_username on addon_configs(trakt_username) where trakt_username is not null;

-- 3. Recreate config_preferences
create table if not exists config_preferences (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references addon_configs(id) on delete cascade,
  enabled_card_types jsonb not null default '["totals","streak","peak","weekly","genre","binge","dropped","monthly","recurring","rewatch","seasonal","actor","director","writer","anime","ranking","memories","firstplay","giorni","migliore","anno","mese","split","notturno","events","pace","weekend","annuale","primetime","decade","break","avg","night","series","vintage","completion"]'::jsonb,
  focus_mode text not null default 'adaptive',
  seasonal_enabled boolean not null default true,
  festive_enabled boolean not null default true,
  style_mode text not null default 'cinematic',
  unique(config_id)
);

-- 4. Recreate insight_snapshots
create table if not exists insight_snapshots (
  config_id uuid primary key references addon_configs(id) on delete cascade,
  taste_profile text not null default 'mixed',
  seasonal_key text not null default 'standard',
  summary jsonb not null default '{}'::jsonb,
  recurring_titles jsonb not null default '[]'::jsonb,
  rewatch_titles jsonb not null default '[]'::jsonb,
  genre_counts jsonb not null default '[]'::jsonb,
  top_actors jsonb not null default '[]'::jsonb,
  top_directors jsonb not null default '[]'::jsonb,
  ranking jsonb null default null,
  top_writers jsonb not null default '[]'::jsonb,
  first_play jsonb null default null,
  plays_by_month jsonb not null default '[]'::jsonb,
  content_by_year jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

-- 5. Recreate adaptive_rows
create table if not exists adaptive_rows (
  config_id uuid not null references addon_configs(id) on delete cascade,
  catalog_id text not null,
  metas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (config_id, catalog_id)
);

-- 6. Recreate adaptive_meta
create table if not exists adaptive_meta (
  config_id uuid not null references addon_configs(id) on delete cascade,
  meta_id text not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (config_id, meta_id)
);

-- 7. Recreate trakt_events
create table if not exists trakt_events (
  id text primary key,
  config_id uuid not null references addon_configs(id) on delete cascade,
  trakt_id text not null,
  trakt_type text not null,
  title text not null,
  year integer,
  watched_at timestamptz not null,
  runtime_minutes integer,
  genres jsonb,
  tmdb_id integer,
  payload jsonb
);

-- 8. Recreate user_profiles
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references addon_configs(id) on delete cascade,
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  avatar_url text,
  accent_color text not null default '#22c55e',
  created_at timestamptz not null default now()
);

-- 9. TMDB cache
create table if not exists tmdb_cache (
  id serial primary key,
  tmdb_id text not null,
  media_type text not null,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(tmdb_id, media_type)
);
create index if not exists idx_tmdb_cache_lookup on tmdb_cache(tmdb_id, media_type);
