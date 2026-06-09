import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generatePosterBuffer, generateSvgPoster } from '../services/artworkService.js';
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

const pngCache = new Map<string, { buf: Buffer; age: number }>();

export async function posterHandler(req: Request, res: Response) {
  setCors(res);
  try {
    const { configId, cardId } = req.params;
    if (!configId || !cardId) { res.status(400).send('Missing params'); return; }

    const uuid = await resolveConfigId(configId);
    if (!uuid) { res.status(404).send('Config not found'); return; }

    const cacheKey = `${uuid}_${cardId}`;
    const cached = pngCache.get(cacheKey);
    if (cached && Date.now() - cached.age < CACHE_TTL) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.buf);
      return;
    }

    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    const cardData = buildCardData(rowData, cardId);

    let imageBuffer: Buffer | null = null;
    if (cardData.imageUrl) {
      try {
        imageBuffer = await fetchImageBuffer(cardData.imageUrl);
      } catch {}
    }

    const buf = await generatePosterBuffer({
      title: cardData.title,
      subtitle: cardData.subtitle.slice(0, 60),
      accent: cardData.accent,
      statValue: cardData.statValue,
      statLabel: cardData.statLabel,
      imageBuffer
    });

    pngCache.set(cacheKey, { buf, age: Date.now() });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch {
    const fallback = generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(fallback);
  }
}

export async function videoPosterHandler(req: Request, res: Response) {
  setCors(res);
  try {
    const { configId, cardId, vIdx } = req.params;
    if (!configId || !cardId || vIdx === undefined) { res.status(400).send('Missing params'); return; }

    const uuid = await resolveConfigId(configId);
    if (!uuid) { res.status(404).send('Config not found'); return; }

    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    if (!rowData?.metas) { res.status(404).send('No metas'); return; }

    const card = rowData.metas.find((m: any) => m.id === cardId || m.id.endsWith(`_${cardId}`));
    if (!card) { res.status(404).send('Card not found'); return; }

    const metaId = `adaptive_${uuid}_${cardId}`;
    const { data: metaData } = await supabase
      .from('adaptive_meta')
      .select('meta')
      .eq('config_id', uuid)
      .eq('meta_id', metaId)
      .maybeSingle();

    const videos = metaData?.meta?.videos || [];
    const vid = videos[parseInt(vIdx, 10)];
    if (!vid) { res.status(404).send('Video not found'); return; }

    if (vid.tmdb_id) {
      const { fetchTmdbDetails } = await import('../services/tmdbService.js');
      const tmdbData = await fetchTmdbDetails(vid.tmdb_id, vid.trakt_type || 'movie');
      const imgUrl = tmdbData?.backdrop || tmdbData?.poster;
      if (imgUrl) {
        res.redirect(imgUrl);
        return;
      }
    }

    const fallback = generateSvgPoster({ title: vid.title, subtitle: 'Nessuna immagine disponibile', imageUrl: '' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(fallback);
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' }));
  }
}
