import { Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { generateSvgPoster } from '../services/artworkService.js';

export async function posterHandler(req: Request, res: Response) {
  try {
    const { configId, cardId } = req.params;
    if (!configId || !cardId) {
      return res.status(400).send('Missing params');
    }

    // Try to get meta from adaptive_meta table
    const { data } = await supabase
      .from('adaptive_meta')
      .select('meta')
      .eq('config_id', configId)
      .eq('meta_id', cardId)
      .maybeSingle();

    // Also check adaptive_rows for the full cards list
    const { data: rowData } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', configId)
      .eq('catalog_id', 'adaptive-insights')
      .maybeSingle();

    let cardTitle = 'Insight';
    let cardDesc = '';
    let cardAccent = '#0ea5e9';
    let statValue = '';
    let statLabel = '';

    if (data?.meta?.name) {
      cardTitle = data.meta.name;
      cardDesc = data.meta.description || '';
    }

    if (rowData?.metas) {
      const found = rowData.metas.find((m: any) => m.id === cardId);
      if (found) {
        cardTitle = found.name || cardTitle;
        cardDesc = found.description || cardDesc;
      }
    }

    // Extract accent from card ID patterns
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

    const svg = generateSvgPoster({
      title: cardTitle,
      subtitle: cardDesc.slice(0, 50),
      accent: cardAccent,
      statValue,
      statLabel
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (error) {
    const fallback = generateSvgPoster({ title: 'Insight', subtitle: 'Statistiche personali' });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(fallback);
  }
}
