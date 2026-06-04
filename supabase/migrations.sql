create extension if not exists pgcrypto;

create table if not exists addon_configs (
  id uuid primary key,
  trakt_username text,
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  sync_enabled boolean not null default true,
  selected_catalogs jsonb not null default '[]'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog_cache (
  config_id uuid not null references addon_configs(id) on delete cascade,
  catalog_id text not null,
  metas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (config_id, catalog_id)
);
