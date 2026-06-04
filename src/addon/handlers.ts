import { getCatalogMetas } from '../services/catalogService.js';
export async function catalogHandler(configId: string, catalogId: string) {
  const metas = await getCatalogMetas(configId, catalogId);
  return { metas };
}
