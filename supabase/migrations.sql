create extension if not exists pgcrypto;

create table if not exists addon_configs (
  id uuid primary key,
  trakt_username text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  sync_enabled boolean not null default true,
  selected_catalogs jsonb not null default '[]'::jsonb,
  active_profile_id uuid null,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key,
  config_id uuid not null references addon_configs(id) on delete cascade,
  name text not null,
  slug text not null,
  is_default boolean not null default false,
  avatar_url text null,
  accent_color text null,
  created_at timestamptz not null default now()
);

create table if not exists trakt_events (
  id text primary key,
  config_id uuid not null references addon_configs(id) on delete cascade,
  trakt_id text not null,
  trakt_type text not null,
  title text not null,
  year integer null,
  watched_at timestamptz not null,
  runtime_minutes integer null,
  genres jsonb null,
  people jsonb null,
  tmdb_id bigint null,
  poster_url text null,
  backdrop_url text null,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists stats_snapshots (
  config_id uuid primary key references addon_configs(id) on delete cascade,
  movies_watched integer not null default 0,
  episodes_watched integer not null default 0,
  shows_started integer not null default 0,
  total_watch_minutes integer not null default 0,
  top_genre text null,
  top_person text null,
  top_month text null,
  recurring_month_number text null,
  recurring_month_count integer null,
  rewatches jsonb not null default '[]'::jsonb,
  genre_counts jsonb not null default '[]'::jsonb,
  people_counts jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

create table if not exists card_cache (
  config_id uuid not null references addon_configs(id) on delete cascade,
  catalog_id text not null,
  metas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (config_id, catalog_id)
);

create table if not exists catalog_cache (
  config_id uuid not null references addon_configs(id) on delete cascade,
  catalog_id text not null,
  metas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (config_id, catalog_id)
);
