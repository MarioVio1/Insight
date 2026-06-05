import { getCatalogMetas } from '../services/catalogService.js';
import { getMetaById } from '../services/metaService.js';

export async function catalogHandler(configId: string, catalogId: string) {
  const metas = await getCatalogMetas(configId, catalogId);
  return { metas };
}

export async function metaHandler(configId: string, metaId: string) {
  const meta = await getMetaById(configId, metaId);
  return { meta };
}
