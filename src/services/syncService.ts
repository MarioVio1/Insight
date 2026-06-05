import { supabase } from './supabase.js';
import { decrypt, encrypt } from './crypto.js';
import { getHistory, getUserSettings, getWatchlist, refreshToken } from './trakt.js';
import { ensureDefaultProfile } from './profileService.js';
import { computeStatsSnapshot } from './statsService.js';
import { rebuildCardCache } from './cardComposerService.js';

async function ensureFreshToken(row: any) {
  if (!row.expires_at || new Date(row.expires_at).getTime() > Date.now() + 60000) return row;
  const refreshed = await refreshToken(decrypt(row.refresh_token_enc));
  const updated = {
    access_token_enc: encrypt(refreshed.access_token),
    refresh_token_enc: encrypt(refreshed.refresh_token),
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  };
  await supabase.from('addon_configs').update(updated).eq('id', row.id);
  return { ...row, ...updated };
}

function normalizeWatchItem(configId: string, item: any, traktType: 'movie'|'episode'|'show') {
  const source = item.movie || item.show || item.episode || item;
  const title = source.title || source.show?.title || 'Untitled';
  return {
    id: `${configId}_${traktType}_${source.ids?.trakt || source.ids?.imdb || Math.random()}`,
    config_id: configId,
    trakt_id: String(source.ids?.trakt || source.ids?.imdb || title),
    trakt_type: traktType,
    title,
    year: source.year || null,
    watched_at: item.watched_at || new Date().toISOString(),
    runtime_minutes: source.runtime || null,
    genres: source.genres || null,
    people: null,
    tmdb_id: source.ids?.tmdb || null,
    poster_url: null,
    backdrop_url: null,
    payload: item
  };
}

export async function syncConfig(configId: string) {
  const { data: row } = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  if (!row) return;
  const fresh = await ensureFreshToken(row);
  const access = decrypt(fresh.access_token_enc);
  const settings = await getUserSettings(access);
  const [wm, ws, hm, hs] = await Promise.all([
    getWatchlist(access, 'movies'), getWatchlist(access, 'shows'),
    getHistory(access, 'movies'), getHistory(access, 'shows')
  ]);

  await supabase.from('addon_configs').update({
    trakt_username: settings.user?.username || row.trakt_username || null,
    last_sync_at: new Date().toISOString()
  }).eq('id', configId);

  const historyRows = [
    ...hm.map((x: any) => normalizeWatchItem(configId, x, 'movie')),
    ...hs.map((x: any) => normalizeWatchItem(configId, x, 'show'))
  ];
  for (const hr of historyRows) {
    await supabase.from('trakt_events').upsert(hr, { onConflict: 'id' });
  }

  await supabase.from('catalog_cache').upsert([
    { config_id: configId, catalog_id: 'watchlist-movies', metas: wm.map((x: any) => ({ id: `tt${x.movie?.ids?.imdb || x.movie?.ids?.trakt}`, type: 'movie', name: x.movie?.title })), updated_at: new Date().toISOString() },
    { config_id: configId, catalog_id: 'watchlist-series', metas: ws.map((x: any) => ({ id: `tt${x.show?.ids?.imdb || x.show?.ids?.trakt}`, type: 'series', name: x.show?.title })), updated_at: new Date().toISOString() }
  ], { onConflict: 'config_id,catalog_id' });

  await ensureDefaultProfile(configId);
  await computeStatsSnapshot(configId);
  await rebuildCardCache(configId);
}

export async function syncAll() {
  const { data } = await supabase.from('addon_configs').select('id').eq('sync_enabled', true);
  for (const row of data ?? []) await syncConfig(row.id);
}
