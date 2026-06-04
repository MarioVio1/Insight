import { supabase } from './supabase.js';
import { decrypt, encrypt } from './crypto.js';
import { getHistory, getWatchlist, refreshToken } from './trakt.js';

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

function mapMovie(item: any) {
  const movie = item.movie || item;
  return {
    id: `tt${movie.ids?.imdb || movie.ids?.trakt}`,
    type: 'movie',
    name: movie.title,
    poster: movie.images?.poster?.[0] || undefined
  };
}
function mapShow(item: any) {
  const show = item.show || item;
  return {
    id: `tt${show.ids?.imdb || show.ids?.trakt}`,
    type: 'series',
    name: show.title,
    poster: show.images?.poster?.[0] || undefined
  };
}

export async function syncConfig(configId: string) {
  const { data: row } = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  if (!row) return;
  const fresh = await ensureFreshToken(row);
  const access = decrypt(fresh.access_token_enc);
  const [wm, ws, hm, hs] = await Promise.all([
    getWatchlist(access, 'movies'), getWatchlist(access, 'shows'),
    getHistory(access, 'movies'), getHistory(access, 'shows')
  ]);
  const payloads = [
    { config_id: configId, catalog_id: 'watchlist-movies', metas: wm.map(mapMovie), updated_at: new Date().toISOString() },
    { config_id: configId, catalog_id: 'watchlist-series', metas: ws.map(mapShow), updated_at: new Date().toISOString() },
    { config_id: configId, catalog_id: 'history-movies', metas: hm.map(mapMovie), updated_at: new Date().toISOString() },
    { config_id: configId, catalog_id: 'history-series', metas: hs.map(mapShow), updated_at: new Date().toISOString() }
  ];
  for (const p of payloads) {
    await supabase.from('catalog_cache').upsert(p, { onConflict: 'config_id,catalog_id' });
  }
  await supabase.from('addon_configs').update({ last_sync_at: new Date().toISOString() }).eq('id', configId);
}

export async function syncAll() {
  const { data } = await supabase.from('addon_configs').select('id').eq('sync_enabled', true);
  for (const row of data ?? []) await syncConfig(row.id);
}
