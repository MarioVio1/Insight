import { supabase } from './supabase.js';
import { decrypt, encrypt } from './crypto.js';
import { getHistory, getUserSettings, refreshToken } from './trakt.js';
import { ensureDefaultProfile } from './profileService.js';
import { computeAdaptiveInsights } from './statsEngine.js';
import { rebuildAdaptiveRow } from './cardComposer.js';

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

function normalizeWatchItem(configId: string, item: any, traktType: 'movie'|'show') {
  const source = item.movie || item.show || item;
  const episode = item.episode || null;
  const uniqueId = episode?.ids?.trakt || item.id || source.ids?.trakt || source.ids?.imdb || `${source.title}_${item.watched_at}`;
  return {
    id: `${configId}_${traktType}_${uniqueId}`,
    config_id: configId,
    trakt_id: String(uniqueId),
    trakt_type: traktType,
    title: source.title || 'Untitled',
    year: source.year || null,
    watched_at: item.watched_at || new Date().toISOString(),
    runtime_minutes: episode?.runtime || source.runtime || null,
    genres: source.genres || null,
    tmdb_id: episode?.ids?.tmdb || source.ids?.tmdb || null,
    payload: item
  };
}

export async function syncConfig(configId: string) {
  const { data: row } = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  if (!row || !row.access_token_enc) return;
  const fresh = await ensureFreshToken(row);
  const access = decrypt(fresh.access_token_enc);
  const settings = await getUserSettings(access);
  const [hm, hs] = await Promise.all([
    getHistory(access, 'movies'),
    getHistory(access, 'shows')
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

  await ensureDefaultProfile(configId);
  await computeAdaptiveInsights(configId);
  await rebuildAdaptiveRow(configId);
}

export async function syncAll() {
  const { data } = await supabase.from('addon_configs').select('id').eq('sync_enabled', true);
  for (const row of data ?? []) await syncConfig(row.id);
}
