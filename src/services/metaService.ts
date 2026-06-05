import { supabase } from './supabase.js';

export async function getMetaById(configId: string, metaId: string) {
  const { data } = await supabase
    .from('card_cache')
    .select('catalog_id, metas')
    .eq('config_id', configId);
  for (const row of data ?? []) {
    const found = (row.metas || []).find((m: any) => m.id === metaId);
    if (found) return found;
  }
  return null;
}
