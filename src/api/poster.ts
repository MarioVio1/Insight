import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generateSvgPoster } from '../services/artworkService.js';
import { resolveConfigId } from '../services/db.js';
import { fetchImageBuffer } from '../services/tmdbService.js';

const CACHE_TTL = 300_000;

function setCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

function buildCardData(rowData: any, cardId: string) {
  let title = 'Insight';
  let subtitle = '';
  let accent = '#0ea5e9';
  let statValue = '';
  let statLabel = '';
  let imageUrl = '';

  if (rowData?.metas) {
    const found = rowData.metas.find((m: any) => m.id === cardId || m.id.endsWith(`_${cardId}`));
    if (found) {
      title = found.name || title;
      subtitle = found.description || subtitle;
      statValue = found.statValue || '';
      statLabel = found.statLabel || '';
      imageUrl = found.imageUrl || '';
    }
  }

  if (cardId.includes('totals')) accent = '#22c55e';
  else if (cardId.includes('streak')) accent = '#f97316';
  else if (cardId.includes('peak')) accent = '#a855f7';
  else if (cardId.includes('day') || cardId.includes('weekly')) accent = '#38bdf8';
  else if (cardId.includes('genre')) accent = '#a855f7';
  else if (cardId.includes('binge')) accent = '#ef4444';
  else if (cardId.includes('dropped')) accent = '#6b7280';
  else if (cardId.includes('monthly')) accent = '#14b8a6';
  else if (cardId.includes('recurring')) accent = '#f59e0b';
  else if (cardId.includes('rewatch')) accent = '#ef4444';
  else if (cardId.includes('seasonal')) accent = '#0ea5e9';
  else if (cardId.includes('actor')) accent = '#ec4899';
  else if (cardId.includes('director')) accent = '#8b5cf6';
  else if (cardId.includes('anime')) accent = '#f43f5e';
  else if (cardId.includes('ranking')) accent = '#fbbf24';
  else if (cardId.includes('memories')) accent = '#d946ef';
  else if (cardId.includes('giorni')) accent = '#06b6d4';
  else if (cardId.includes('migliore')) accent = '#fbbf24';
  else if (cardId.includes('anno')) accent = '#84cc16';
  else if (cardId.includes('mese')) accent = '#a3e635';
  else if (cardId.includes('split')) accent = '#2dd4bf';
  else if (cardId.includes('notturno')) accent = '#6366f1';
  else if (cardId.includes('pace')) accent = '#f59e0b';
  else if (cardId.includes('weekend')) accent = '#8b5cf6';
  else if (cardId.includes('annuale')) accent = '#84cc16';
  else if (cardId.includes('primetime')) accent = '#6366f1';
  else if (cardId.includes('decade')) accent = '#06b6d4';
  else if (cardId.includes('break')) accent = '#6b7280';

  return { title, subtitle, accent, statValue, statLabel: statLabel.slice(0, 30), imageUrl };
}

const svgCache = new Map<string, { svg: string; age: number }>();

export async function posterHandler(req: Request, res: Response) {
  setCors(res);
  try {
    const { configId, cardId } = req.params;
    if (!configId || !cardId) { res.status(400).send('Missing params'); return; }

    const uuid = await resolveConfigId(configId);
    if (!uuid) { res.status(404).send('Config not found'); return; }

    const cacheKey = `${uuid}_${cardId}`;
    const cached = svgCache.get(cacheKey);
    if (cached && Date.now() - cached.age < CACHE_TTL) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.svg);
      return;
    }

    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    const cardData = buildCardData(rowData, cardId);

    let imageDataUri = '';
    if (cardData.imageUrl) {
      try {
        const imgBuf = await fetchImageBuffer(cardData.imageUrl);
        const mime = cardData.imageUrl.match(/\.png/i) ? 'image/png' : 'image/jpeg';
        imageDataUri = `data:${mime};base64,${imgBuf.toString('base64')}`;
      } catch {}
    }

    const svg = generateSvgPoster({
      title: cardData.title,
      subtitle: cardData.subtitle.slice(0, 60),
      accent: cardData.accent,
      statValue: cardData.statValue,
      statLabel: cardData.statLabel,
      imageUrl: imageDataUri
    });

    svgCache.set(cacheKey, { svg, age: Date.now() });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch {
    const svg = generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
}
