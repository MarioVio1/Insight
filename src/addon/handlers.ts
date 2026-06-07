import { supabase } from '../services/supabase.js';

export async function catalogHandler(configId: string, catalogId: string) {
  const normalizedCatalogId = catalogId === 'adaptive-insights-series' ? 'adaptive-insights' : catalogId;
  const { data } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', normalizedCatalogId)
    .maybeSingle();

  const metas = (data?.metas ?? []).map((m: any) => ({
    ...m,
    type: catalogId === 'adaptive-insights-series' ? 'series' : 'movie'
  }));

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
