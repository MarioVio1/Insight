import { supabase } from './supabase.js';
export async function getCatalogMetas(configId: string, catalogId: string) {
  const { data, error } = await supabase
    .from('catalog_cache')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', catalogId)
    .maybeSingle();
  if (error) throw error;
  return data?.metas ?? [];
}
