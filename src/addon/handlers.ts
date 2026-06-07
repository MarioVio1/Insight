import { supabase } from '../services/supabase.js';

export async function catalogHandler(configId: string, catalogId: string) {
  const { data } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', 'adaptive-insights')
    .maybeSingle();

  const metas = (data?.metas ?? []).map((m: any) => {
    const { statValue, statLabel, imageUrl, ...clean } = m;
    return { ...clean, type: 'movie' };
  });

  return { metas };
}

export async function metaHandler(configId: string, metaId: string) {
  const { data } = await supabase
    .from('adaptive_meta')
    .select('meta')
    .eq('config_id', configId)
    .eq('meta_id', metaId)
    .maybeSingle();

  if (!data?.meta) return { meta: null };

  return {
    meta: {
      ...data.meta,
      type: 'series'
    }
  };
}
