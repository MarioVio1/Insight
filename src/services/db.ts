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

export async function checkTables(): Promise<boolean> {
  try {
    const { error } = await supabase.from('config_preferences').select('id').limit(1);
    if (error && error.message?.includes('does not exist')) {
      console.error('ERRORE: Tabelle Supabase non create. Esegui supabase/init.sql nel SQL Editor di Supabase.');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
