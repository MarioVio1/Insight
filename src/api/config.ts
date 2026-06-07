import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
import { syncConfig } from '../services/syncService.js';
import { resolveConfigId, checkTablesDetailed } from '../services/db.js';

const router = Router();

router.post('/config', async (req, res) => {
  try {
    const body = req.body || {};
    let slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slug) slug = crypto.randomUUID().slice(0, 8);

    const { data: existing } = await supabase
      .from('addon_configs')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) {
      return res.json({ ok: true, id: existing.id, slug, configureUrl: `/configure/${slug}` });
    }

    const id = crypto.randomUUID();
    const payload = { id, slug, sync_enabled: true, selected_catalogs: ['adaptive-insights'] };
    const { error } = await supabase.from('addon_configs').insert(payload);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    await supabase.from('config_preferences').insert({
      config_id: id,
      enabled_card_types: body.enabled_card_types ?? ['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking','memories','giorni','migliore','anno','mese','split','notturno'],
      focus_mode: body.focus_mode ?? 'adaptive',
      seasonal_enabled: body.seasonal_enabled ?? true,
      festive_enabled: body.festive_enabled ?? true,
      style_mode: body.style_mode ?? 'cinematic'
    });

    return res.json({ ok: true, id, slug, configureUrl: `/configure/${slug}` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/config/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const { data: cfg } = await supabase.from('addon_configs').select('*').eq('id', uuid).maybeSingle();
  const { data: pref } = await supabase.from('config_preferences').select('*').eq('config_id', uuid).maybeSingle();
  if (!cfg) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, ...cfg, udid: cfg.id, preferences: pref });
});

router.put('/config/:configId/preferences', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const { error: err1 } = await supabase.from('config_preferences').update(req.body).eq('config_id', uuid);
  if (err1) return res.status(500).json({ ok: false, error: err1.message });
  await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
  return res.json({ ok: true });
});

router.post('/config/:configId/sync', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const result = await syncConfig(uuid);
  if (result.ok) {
    await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
  }
  return res.json(result);
});

async function countTable(table: string, configId?: string): Promise<number> {
  const col = (table === 'adaptive_rows' || table === 'adaptive_meta') ? 'config_id' : 'id';
  const q = configId
    ? supabase.from(table).select(col, { count: 'exact', head: true }).eq('config_id', configId)
    : supabase.from(table).select(col, { count: 'exact', head: true });
  const { count, error } = await q;
  return error ? -1 : (count ?? 0);
}

router.get('/status/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Config non trovata' });

  const tables = await checkTablesDetailed();
  const allTablesOk = tables.every(t => t.exists);

  const { data: cfg } = await supabase.from('addon_configs').select('*').eq('id', uuid).maybeSingle();
  if (!cfg) return res.status(404).json({ ok: false, error: 'Config non trovata' });

  const eventCount = await countTable('trakt_events', uuid);
  const cardCount = await countTable('adaptive_rows', uuid);

  const { data: rowData } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', uuid)
    .eq('catalog_id', 'adaptive-insights')
    .maybeSingle();
  const actualCards = Array.isArray(rowData?.metas) ? rowData.metas.length : 0;

  const hasTmdb = !!(process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN);

  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!allTablesOk) {
    issues.push('Tabelle del database mancanti - esegui supabase/init.sql');
    suggestions.push('Apri il SQL Editor di Supabase, incolla e esegui supabase/init.sql (una volta sola)');
  }
  if (!cfg.access_token_enc) {
    issues.push('Trakt non collegato');
    suggestions.push('Vai su /configure/' + cfg.slug + ' e clicca "Collega Trakt"');
  }
  if (cfg.access_token_enc && !cfg.last_sync_at) {
    issues.push('Sync mai eseguita');
    suggestions.push('Vai su /configure/' + cfg.slug + ' e clicca "Sync"');
  }
  if (allTablesOk && cfg.access_token_enc && cfg.last_sync_at && actualCards === 0) {
    issues.push('Nessuna card generata nonostante i dati');
    suggestions.push('Controlla i log di Railway per errori durante sync/computeAdaptiveInsights/rebuildAdaptiveRow');
  }
  if (!hasTmdb) {
    suggestions.push('Variabile TMDB_API_KEY o TMDB_BEARER_TOKEN non impostata - le card con poster mostreranno solo sfondo sfumato');
  }

  res.json({
    ok: true,
    config: {
      slug: cfg.slug,
      trakt_connected: !!cfg.access_token_enc,
      trakt_username: cfg.trakt_username || null,
      last_sync: cfg.last_sync_at || null,
      sync_enabled: cfg.sync_enabled
    },
    database: {
      all_tables_ok: allTablesOk,
      tables,
      trakt_events_count: eventCount,
      cards_in_db: cardCount,
      actual_cards_in_row: actualCards
    },
    env: {
      has_tmdb_key: hasTmdb,
      base_url: process.env.BASE_URL || 'http://localhost:3000'
    },
    issues,
    suggestions
  });
});

export default router;
