import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generateBackgroundSvg, generateOverlaySvg, generateSvgPoster } from '../services/artworkService.js';
import { resolveConfigId } from '../services/db.js';
import { fetchImageBuffer } from '../services/tmdbService.js';

const CACHE_TTL = 300_000;
const POSTER_W = 600;
const POSTER_H = 900;

let sharpLoadAttempted = false;
let sharpAvailable = false;
let sharpModule: any = null;

async function getSharp() {
  if (!sharpLoadAttempted) {
    sharpLoadAttempted = true;
    try {
      sharpModule = (await import('sharp')).default;
      sharpAvailable = true;
    } catch {
      sharpAvailable = false;
    }
  }
  return sharpAvailable ? sharpModule : null;
}

type CardData = {
  title: string;
  subtitle: string;
  accent: string;
  statValue: string;
  statLabel: string;
  imageUrl: string;
};

function buildCardData(rowData: any, cardId: string): CardData {
  let title = 'Insight';
  let subtitle = '';
  let accent = '#0ea5e9';
  let statValue = '';
  let statLabel = '';
  let imageUrl = '';

  if (rowData?.metas) {
    const found = rowData.metas.find((m: any) => m.id === cardId);
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

async function renderPng(data: CardData): Promise<Buffer | null> {
  const sharp = await getSharp();
  if (!sharp) return null;

  const { title, subtitle, accent, statValue, statLabel, imageUrl } = data;

  if (imageUrl) {
    try {
      const posterBuf = await fetchImageBuffer(imageUrl);
      const base = await sharp(posterBuf)
        .resize(POSTER_W, POSTER_H, { fit: 'cover' })
        .png()
        .toBuffer();

      const overlaySvg = generateOverlaySvg({ title, subtitle, accent, statValue, statLabel });

      return sharp(base)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .png()
        .toBuffer();
    } catch {
      // fall through to gradient background
    }
  }

  try {
    const bgSvg = generateBackgroundSvg(accent);
    const bgBuf = await sharp(Buffer.from(bgSvg)).png().toBuffer();
    const overlaySvg = generateOverlaySvg({ title, subtitle, accent, statValue, statLabel });

    return sharp(bgBuf)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

const cache = new Map<string, { buffer: Buffer; age: number }>();

function setCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

export async function posterHandler(req: Request, res: Response) {
  setCors(res);
  try {
    const { configId, cardId } = req.params;
    if (!configId || !cardId) { res.status(400).send('Missing params'); return; }

    const uuid = await resolveConfigId(configId);
    if (!uuid) { res.status(404).send('Config not found'); return; }

    const cacheKey = `${uuid}_${cardId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.age < CACHE_TTL) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.buffer);
      return;
    }

    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', uuid)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    const cardData = buildCardData(rowData, cardId);
    const svg = generateSvgPoster({
      title: cardData.title,
      subtitle: cardData.subtitle.slice(0, 60),
      accent: cardData.accent,
      statValue: cardData.statValue,
      statLabel: cardData.statLabel,
      imageUrl: cardData.imageUrl
    });

    const pngBuf = await renderPng(cardData);
    if (pngBuf) {
      cache.set(cacheKey, { buffer: pngBuf, age: Date.now() });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(pngBuf);
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch {
    const svg = generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
}
