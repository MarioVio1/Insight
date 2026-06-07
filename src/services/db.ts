import { supabase } from './supabase.js';

const slugCache = new Map<string, { uuid: string; age: number }>();
const CACHE_TTL = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveConfigId(slugOrId: string): Promise<string | null> {
  if (!slugOrId) return null;
  const norm = slugOrId.toLowerCase().trim();
  if (UUID_RE.test(norm)) return norm;

  const cached = slugCache.get(norm);
  if (cached && Date.now() - cached.age < CACHE_TTL) return cached.uuid;

  const { data } = await supabase
    .from('addon_configs')
    .select('id')
    .eq('slug', norm)
    .maybeSingle();
  if (data?.id) {
    slugCache.set(norm, { uuid: data.id, age: Date.now() });
    return data.id;
  }
  return null;
}

const REQUIRED_TABLES = ['config_preferences', 'insight_snapshots', 'adaptive_rows', 'adaptive_meta', 'trakt_events'];
const TABLE_NAMES_IT: Record<string, string> = {
  config_preferences: 'config_preferences (preferenze utente)',
  insight_snapshots: 'insight_snapshots (statistiche calcolate)',
  adaptive_rows: 'adaptive_rows (righe catalogo Stremio)',
  adaptive_meta: 'adaptive_meta (dettaglio card Stremio)',
  trakt_events: 'trakt_events (cronologia Trakt)'
};

export async function checkTables(): Promise<boolean> {
  let allOk = true;
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && error.message?.includes('does not exist')) {
        console.error(`ERRORE: Tabella "${table}" non trovata. Esegui supabase/init.sql nel SQL Editor di Supabase.`);
        allOk = false;
      }
    } catch {
      allOk = false;
    }
  }
  return allOk;
}

export async function checkTablesDetailed(): Promise<{ table: string; exists: boolean }[]> {
  const results: { table: string; exists: boolean }[] = [];
  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      results.push({ table: TABLE_NAMES_IT[table] || table, exists: !(error && error.message?.includes('does not exist')) });
    } catch {
      results.push({ table: TABLE_NAMES_IT[table] || table, exists: false });
    }
  }
  return results;
}
