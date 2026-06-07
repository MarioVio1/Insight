import { supabase } from './supabase.js';
import { decrypt, encrypt } from './crypto.js';
import { getHistory, getUserSettings, refreshToken } from './trakt.js';
import { ensureDefaultProfile } from './profileService.js';
import { computeAdaptiveInsights } from './statsEngine.js';
import { rebuildAdaptiveRow } from './cardComposer.js';
import { logger } from '../utils/logger.js';

async function ensureFreshToken(row: any) {
  if (!row.expires_at || new Date(row.expires_at).getTime() > Date.now() + 60000) return row;
  logger.info({ configId: row.id }, 'Refreshing Trakt token');
  const refreshed = await refreshToken(decrypt(row.refresh_token_enc));
  const updated = {
    access_token_enc: encrypt(refreshed.access_token),
    refresh_token_enc: encrypt(refreshed.refresh_token),
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  };
  await supabase.from('addon_configs').update(updated).eq('id', row.id);
  return { ...row, ...updated };
}

function normalizeWatchItem(configId: string, item: any, traktType: 'movie' | 'show') {
  const source = item.movie || item.show || item;
  const episode = item.episode || null;
  const ts = item.watched_at || new Date().toISOString();
  const contentId = String(episode?.ids?.trakt || item.id || source.ids?.trakt || source.ids?.imdb || source.title || 'unknown');
  return {
    id: `${configId}_${traktType}_${contentId}_${ts}`,
    config_id: configId,
    trakt_id: contentId,
    trakt_type: traktType,
    title: source.title || 'Untitled',
    year: source.year || null,
    watched_at: ts,
    runtime_minutes: episode?.runtime || (traktType === 'movie' ? source.runtime : null) || null,
    genres: source.genres || null,
    tmdb_id: episode?.ids?.tmdb || source.ids?.tmdb || null,
    payload: item
  };
}

export async function syncConfig(configId: string) {
  logger.info({ configId }, 'Starting sync');
  const { data: row, error: rowErr } = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  if (rowErr || !row) {
    logger.error({ configId, error: rowErr }, 'Config not found');
    return { ok: false, error: 'Config not found' };
  }
  if (!row.access_token_enc) {
    logger.warn({ configId }, 'No Trakt token, skipping sync');
    return { ok: false, error: 'Trakt not connected' };
  }

  try {
    const fresh = await ensureFreshToken(row);
    const access = decrypt(fresh.access_token_enc);
    const settings = await getUserSettings(access);
    logger.info({ configId, username: settings.user?.username }, 'Trakt connected');

    const [hm, hs] = await Promise.all([
      getHistory(access, 'movies'),
      getHistory(access, 'shows')
    ]);
    logger.info({ configId, movies: hm.length, shows: hs.length }, 'History fetched');

    await supabase.from('addon_configs').update({
      trakt_username: settings.user?.username || row.trakt_username || null,
      last_sync_at: new Date().toISOString()
    }).eq('id', configId);

    // Save in batches to avoid overwhelming Supabase
    const historyRows = [
      ...hm.map((x: any) => normalizeWatchItem(configId, x, 'movie')),
      ...hs.map((x: any) => normalizeWatchItem(configId, x, 'show'))
    ];

    logger.info({ configId, total: historyRows.length }, 'Saving events');
    const batchSize = 100;
    for (let i = 0; i < historyRows.length; i += batchSize) {
      const batch = historyRows.slice(i, i + batchSize);
      const { error: upsertErr } = await supabase.from('trakt_events').upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
      if (upsertErr) logger.error({ configId, error: upsertErr }, 'Batch upsert error');
    }

    await ensureDefaultProfile(configId);
    await computeAdaptiveInsights(configId);
    await rebuildAdaptiveRow(configId);

    logger.info({ configId }, 'Sync completed');
    return { ok: true, count: historyRows.length };
  } catch (error) {
    logger.error({ configId, error: String(error) }, 'Sync failed');
    return { ok: false, error: String(error) };
  }
}

export async function syncAll() {
  const { data } = await supabase.from('addon_configs').select('id').eq('sync_enabled', true);
  logger.info({ count: data?.length }, 'Starting sync all');
  for (const row of data ?? []) await syncConfig(row.id);
}
