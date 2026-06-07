import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generateSvgPoster } from '../services/artworkService.js';
import { resolveConfigId } from '../services/db.js';

const cache = new Map<string, { svg: string; age: number }>();
const CACHE_TTL = 60_000;

export async function posterHandler(req: Request, res: Response) {
  try {
    const { configId, cardId } = req.params;
    if (!configId || !cardId) return res.status(400).send('Missing params');

    const uuid = await resolveConfigId(configId);
    if (!uuid) return res.status(404).send('Config not found');

    const cacheKey = `${uuid}_${cardId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.age < CACHE_TTL) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(cached.svg);
    }

    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    let cardTitle = 'Insight';
    let cardDesc = '';
    let cardAccent = '#0ea5e9';
    let statValue = '';
    let statLabel = '';

    let imageUrl = '';
    if (rowData?.metas) {
      const found = rowData.metas.find((m: any) => m.id === cardId);
      if (found) {
        cardTitle = found.name || cardTitle;
        cardDesc = found.description || cardDesc;
        statValue = found.statValue || '';
        statLabel = found.statLabel || '';
        imageUrl = found.imageUrl || '';
      }
    }

    if (cardId.includes('totals')) cardAccent = '#22c55e';
    else if (cardId.includes('streak')) cardAccent = '#f97316';
    else if (cardId.includes('peak')) cardAccent = '#a855f7';
    else if (cardId.includes('day') || cardId.includes('weekly')) cardAccent = '#38bdf8';
    else if (cardId.includes('genre')) cardAccent = '#a855f7';
    else if (cardId.includes('binge')) cardAccent = '#ef4444';
    else if (cardId.includes('dropped')) cardAccent = '#6b7280';
    else if (cardId.includes('monthly')) cardAccent = '#14b8a6';
    else if (cardId.includes('recurring')) cardAccent = '#f59e0b';
    else if (cardId.includes('rewatch')) cardAccent = '#ef4444';
    else if (cardId.includes('seasonal')) cardAccent = '#0ea5e9';
    else if (cardId.includes('actor')) cardAccent = '#ec4899';
    else if (cardId.includes('director')) cardAccent = '#8b5cf6';
    else if (cardId.includes('anime')) cardAccent = '#f43f5e';
    else if (cardId.includes('ranking')) cardAccent = '#fbbf24';
    else if (cardId.includes('memories')) cardAccent = '#d946ef';
    else if (cardId.includes('giorni')) cardAccent = '#06b6d4';
    else if (cardId.includes('migliore')) cardAccent = '#fbbf24';
    else if (cardId.includes('anno')) cardAccent = '#84cc16';
    else if (cardId.includes('mese')) cardAccent = '#a3e635';
    else if (cardId.includes('split')) cardAccent = '#2dd4bf';
    else if (cardId.includes('notturno')) cardAccent = '#6366f1';

    const svg = generateSvgPoster({
      title: cardTitle,
      subtitle: cardDesc.slice(0, 60),
      accent: cardAccent,
      statValue,
      statLabel,
      imageUrl
    });

    cache.set(cacheKey, { svg, age: Date.now() });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (error) {
    const svg = generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
}
