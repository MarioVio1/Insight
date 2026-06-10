import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
import { syncConfig } from '../services/syncService.js';
import { resolveConfigId, checkTablesDetailed } from '../services/db.js';
import { rebuildAdaptiveRow } from '../services/cardComposer.js';
import { logger } from '../utils/logger.js';
import { INSIGHT_CATALOG_ID, LEGACY_INSIGHT_CATALOG_ID } from '../addon/manifest.js';

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
    const payload = { id, slug, sync_enabled: true, selected_catalogs: [INSIGHT_CATALOG_ID] };
    const { error } = await supabase.from('addon_configs').insert(payload);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    await supabase.from('config_preferences').insert({
      config_id: id,
      enabled_card_types: body.enabled_card_types ?? ['totals','streak','peak','weekly','genre','binge','dropped','monthly','recurring','rewatch','seasonal','actor','director','writer','anime','ranking','memories','firstplay','giorni','migliore','anno','mese','split','notturno','events','pace','weekend','annuale','primetime','decade','break','avg','night','series','vintage','completion'],
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

  const { error: err1 } = await supabase.from('config_preferences').upsert({ config_id: uuid, ...req.body }, { onConflict: 'config_id' });
  if (err1) return res.status(500).json({ ok: false, error: err1.message });
  await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  await rebuildAdaptiveRow(uuid, baseUrl).catch(e => logger.error({ configId: uuid, error: String(e) }, 'Rebuild after prefs failed'));
  return res.json({ ok: true });
});

const syncingConfigs = new Set<string>();

router.post('/config/:configId/sync', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  if (syncingConfigs.has(uuid)) {
    return res.json({ ok: false, error: 'Sync già in corso' });
  }

  syncingConfigs.add(uuid);
  res.json({ ok: true, async: true, message: 'Sync avviata in background' });

  try {
    const result = await syncConfig(uuid);
    if (result.ok) {
      await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
    }
  } catch (err) {
    logger.error({ configId: uuid, error: String(err) }, 'Background sync failed');
  } finally {
    syncingConfigs.delete(uuid);
  }
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

  const { data: rowsData } = await supabase
    .from('adaptive_rows')
    .select('catalog_id, metas')
    .eq('config_id', uuid)
    .in('catalog_id', [INSIGHT_CATALOG_ID, LEGACY_INSIGHT_CATALOG_ID])
    .order('updated_at', { ascending: false });
  const rowData = rowsData?.find((row: any) => row.catalog_id === INSIGHT_CATALOG_ID) || rowsData?.[0];
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
      sync_enabled: cfg.sync_enabled,
      is_syncing: syncingConfigs.has(uuid)
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

router.post('/cleanup', async (_req, res) => {
  try {
    const { data: configs } = await supabase
      .from('addon_configs')
      .select('id, slug, last_sync_at, trakt_username')
      .is('last_sync_at', null);
    const count = configs?.length || 0;
    if (count > 0) {
      const ids = configs!.map(c => c.id);
      await supabase.from('addon_configs').delete().in('id', ids);
    }
    res.json({ ok: true, deleted_configs: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const MIGRATION_SQL = `
alter table insight_snapshots add column if not exists top_writers jsonb not null default '[]'::jsonb;
alter table insight_snapshots add column if not exists first_play jsonb null default null;
alter table insight_snapshots add column if not exists plays_by_month jsonb not null default '[]'::jsonb;
alter table insight_snapshots add column if not exists content_by_year jsonb not null default '[]'::jsonb;
`;

router.post('/migrate', async (_req, res) => {
  try {
    const { error } = await supabase.from('insight_snapshots').select('config_id').limit(1);
    if (error && String(error?.message || error).includes('does not exist')) {
      return res.status(400).json({ ok: false, error: 'Tabella insight_snapshots non esiste. Esegui supabase/init.sql prima.' });
    }
    // Prova a fare un upsert con tutte le colonne per forzare l'errore e capire se mancano
    const testPayload: Record<string, any> = {
      config_id: '00000000-0000-0000-0000-000000000000',
      summary: {},
      top_writers: [],
      first_play: null,
      plays_by_month: [],
      content_by_year: []
    };
    const { error: testErr } = await supabase.from('insight_snapshots').upsert(testPayload, { onConflict: 'config_id' });
    if (!testErr) {
      // Ha funzionato, pulisci il record di test
      await supabase.from('insight_snapshots').delete().eq('config_id', '00000000-0000-0000-0000-000000000000');
      return res.json({ ok: true, message: 'Nessuna migrazione necessaria - tutte le colonne esistono già.' });
    }
    const testMsg = testErr?.message || JSON.stringify(testErr);
    const missingColumns: string[] = [];
    for (const col of ['top_writers', 'first_play', 'plays_by_month', 'content_by_year']) {
      if (testMsg.includes(`"${col}"`) || testMsg.includes(`column "${col}"`)) {
        missingColumns.push(col);
      }
    }
    if (missingColumns.length === 0) {
      return res.status(500).json({ ok: false, error: testMsg, message: 'Errore sconosciuto. Vai su Supabase SQL Editor e incolla:' + MIGRATION_SQL });
    }
    res.json({
      ok: false,
      missing_columns: missingColumns,
      message: `Mancano ${missingColumns.length} colonne. Vai su Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new) e incolla:`,
      sql: MIGRATION_SQL
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
