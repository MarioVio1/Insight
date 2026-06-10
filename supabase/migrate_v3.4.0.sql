-- Migrazione v3.4.0: aggiunge colonne mancanti a insight_snapshots
alter table insight_snapshots add column if not exists top_writers jsonb not null default '[]'::jsonb;
alter table insight_snapshots add column if not exists first_play jsonb null default null;
alter table insight_snapshots add column if not exists plays_by_month jsonb not null default '[]'::jsonb;
alter table insight_snapshots add column if not exists content_by_year jsonb not null default '[]'::jsonb;
