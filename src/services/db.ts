const MIGRATIONS = [
  `create table if not exists config_preferences (
    id uuid primary key default gen_random_uuid(),
    config_id uuid not null references addon_configs(id) on delete cascade,
    max_cards integer not null default 10,
    enabled_card_types jsonb not null default '["totals","streak","peak","weekly","genre","binge","monthly","recurring","rewatch","seasonal","actor","director","anime","ranking"]'::jsonb,
    focus_mode text not null default 'adaptive',
    seasonal_enabled boolean not null default true,
    festive_enabled boolean not null default true,
    style_mode text not null default 'cinematic',
    unique(config_id)
  )`,
  `create table if not exists insight_snapshots (
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
    generated_at timestamptz not null default now()
  )`,
  `create table if not exists adaptive_rows (
    config_id uuid not null references addon_configs(id) on delete cascade,
    catalog_id text not null,
    metas jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (config_id, catalog_id)
  )`,
  `create table if not exists adaptive_meta (
    config_id uuid not null references addon_configs(id) on delete cascade,
    meta_id text not null,
    meta jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (config_id, meta_id)
  )`,
  `alter table insight_snapshots add column if not exists top_actors jsonb not null default '[]'::jsonb`,
  `alter table insight_snapshots add column if not exists top_directors jsonb not null default '[]'::jsonb`,
  `alter table insight_snapshots add column if not exists ranking jsonb null default null`
];

export async function ensureTables() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) return;

  // Extract project ref from SUPABASE_URL: https://<ref>.supabase.co
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return;
  const ref = match[1];

  for (const sql of MIGRATIONS) {
    try {
      const res = await fetch(`https://${ref}.supabase.co/pg/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ query: sql })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`Migration error: ${res.status} ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.error('Migration fetch error:', String(err).slice(0, 200));
    }
  }
}
