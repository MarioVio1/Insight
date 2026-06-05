import { supabase } from '../services/supabase.js';

export async function catalogHandler(configId: string, catalogId: string) {
  const { data } = await supabase.from('adaptive_rows').select('metas').eq('config_id', configId).eq('catalog_id', catalogId).maybeSingle();
  return { metas: data?.metas ?? [] };
}

export async function metaHandler(configId: string, metaId: string) {
  const { data } = await supabase.from('adaptive_meta').select('meta').eq('config_id', configId).eq('meta_id', metaId).maybeSingle();
  return { meta: data?.meta ?? null };
}
