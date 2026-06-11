import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generatePosterBuffer, generateSvgPoster, generateSvgThumbnail } from '../services/artworkService.js';
import { resolveConfigId } from '../services/db.js';
import { fetchImageBuffer, fetchTmdbDetails } from '../services/tmdbService.js';
import { INSIGHT_CATALOG_ID, LEGACY_INSIGHT_CATALOG_ID } from '../addon/manifest.js';

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
const thumbCache = new Map<string, { buf: Buffer; age: number }>();
const THUMB_CACHE_TTL = 300_000;

function accentForCardType(cardId: string): string {
  if (cardId.includes('totals')) return '#22c55e';
  if (cardId.includes('streak')) return '#f97316';
  if (cardId.includes('peak')) return '#a855f7';
  if (cardId.includes('day') || cardId.includes('weekly')) return '#38bdf8';
  if (cardId.includes('genre')) return '#a855f7';
  if (cardId.includes('binge')) return '#ef4444';
  if (cardId.includes('dropped')) return '#6b7280';
  if (cardId.includes('monthly')) return '#14b8a6';
  if (cardId.includes('recurring')) return '#f59e0b';
  if (cardId.includes('rewatch')) return '#ef4444';
  if (cardId.includes('seasonal')) return '#0ea5e9';
  if (cardId.includes('actor')) return '#ec4899';
  if (cardId.includes('director')) return '#8b5cf6';
  if (cardId.includes('anime')) return '#f43f5e';
  if (cardId.includes('ranking')) return '#fbbf24';
  if (cardId.includes('memories')) return '#d946ef';
  if (cardId.includes('writer')) return '#f59e0b';
  if (cardId.includes('firstplay')) return '#fbbf24';
  if (cardId.includes('tipologia')) return '#3b82f6';
  if (cardId.includes('confronto')) return '#22c55e';
  if (cardId.includes('decenni')) return '#06b6d4';
  if (cardId.includes('revisioni')) return '#f43f5e';
  if (cardId.includes('varieta')) return '#a855f7';
  if (cardId.includes('matiniero')) return '#fbbf24';
  if (cardId.includes('intensita')) return '#f59e0b';
  return '#0ea5e9';
}

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

    let { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', INSIGHT_CATALOG_ID)
      .maybeSingle();

    if (!rowData?.metas?.length) {
      const { data: legacy } = await supabase
        .from('adaptive_rows')
        .select('metas')
        .eq('config_id', uuid)
        .eq('catalog_id', LEGACY_INSIGHT_CATALOG_ID)
        .maybeSingle();
      if (legacy?.metas?.length) rowData = legacy;
    }

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

    const cacheKey = `vposter_${uuid}_${cardId}_${vIdx}`;
    const cached = thumbCache.get(cacheKey);
    if (cached && Date.now() - cached.age < THUMB_CACHE_TTL) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.buf);
      return;
    }

    let { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', INSIGHT_CATALOG_ID)
      .maybeSingle();

    if (!rowData?.metas?.length) {
      const { data: legacy } = await supabase
        .from('adaptive_rows')
        .select('metas')
        .eq('config_id', uuid)
        .eq('catalog_id', LEGACY_INSIGHT_CATALOG_ID)
        .maybeSingle();
      if (legacy?.metas?.length) rowData = legacy;
    }

    if (!rowData?.metas) { res.status(404).send('No metas'); return; }

    const card = rowData.metas.find((m: any) => m.id === cardId || m.id.endsWith(`_${cardId}`));
    if (!card) { res.status(404).send('Card not found'); return; }

    const metaId = cardId.startsWith('adaptive_') ? cardId : `adaptive_${uuid}_${cardId}`;
    const { data: metaData } = await supabase
      .from('adaptive_meta')
      .select('meta')
      .eq('config_id', uuid)
      .eq('meta_id', metaId)
      .maybeSingle();

    const videos = metaData?.meta?.videos || [];
    const vid = videos[parseInt(vIdx, 10)];
    if (!vid) { res.status(404).send('Video not found'); return; }

    // Fetch TMDB image e converti in data URI per compatibilità SVG con sharp
    let imgDataUri: string | null = null;

    // Try the video's own thumbnail but skip circular /vposter/ URLs
    if (vid.thumbnail && !vid.thumbnail.includes('/vposter/')) {
      try {
        const imgBuf = await fetchImageBuffer(vid.thumbnail);
        imgDataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
      } catch {}
    }

    // Fallback: try TMDB lookup via tmdb_id
    if (!imgDataUri && vid.tmdb_id) {
      const tmdbData = await fetchTmdbDetails(vid.tmdb_id, vid.trakt_type || 'movie');
      const imgUrl = tmdbData?.poster || tmdbData?.backdrop;
      if (imgUrl) {
        try {
          const imgBuf = await fetchImageBuffer(imgUrl);
          imgDataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
        } catch {}
      }
    }

    // Last resort: try person search for actor/director/writer cards
    if (!imgDataUri) {
      const ct = cardId.toLowerCase();
      if (ct.includes('actors') || ct.includes('directors') || ct.includes('writers') || ct === 'actor' || ct === 'director' || ct === 'writer') {
        try {
          const { searchTmdbPerson, tmdbPersonImage } = await import('../services/tmdbService');
          const person = await searchTmdbPerson(vid.title);
          if (person?.profile_path) {
            const imgBuf = await fetchImageBuffer(tmdbPersonImage(person.profile_path));
            imgDataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
          }
        } catch {}
      }
    }

    const accent = accentForCardType(cardId);
    const svg = generateSvgThumbnail({
      title: vid.title,
      subtitle: vid.overview || '',
      accent,
      imageUrl: imgDataUri || undefined
    });

    const { default: sharp } = await import('sharp');
    const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 6 }).toBuffer();
    thumbCache.set(cacheKey, { buf, age: Date.now() });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' }));
  }
}
