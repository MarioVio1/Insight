import { getUserBySlug, upsertUser, upsertWatchEvents } from './db.js';
import { getAllHistory as traktHistory, refreshToken } from './trakt.js';
import { enrichEvents } from './tmdb.js';

async function ensureValidTraktToken(user) {
  if (!user.trakt_token) return null;
  const now = Date.now();
  if (user.trakt_expires && user.trakt_expires - now < 86400_000) {
    try {
      const refreshed = await refreshToken(user.trakt_refresh);
      if (refreshed.access_token) {
        const updated = await upsertUser(user.slug, {
          trakt_token: refreshed.access_token,
          trakt_refresh: refreshed.refresh_token,
          trakt_expires: now + refreshed.expires_in * 1000
        });
        return updated.trakt_token;
      }
    } catch {}
  }
  return user.trakt_token;
}

export async function syncUser(userSlug) {
  const user = await getUserBySlug(userSlug);
  if (!user) return { error: 'user not found' };

  const results = { trakt: 0, enriched: 0 };

  const token = await ensureValidTraktToken(user);
  if (token) {
    try {
      const events = await traktHistory(token);
      let enriched = events;
      if (user.tmdb_key) {
        enriched = await enrichEvents(events, user.tmdb_key);
        results.enriched = enriched.filter(e => e.genres?.length > 0).length;
      }
      results.trakt = await upsertWatchEvents(user.id, enriched.map(ev => ({ ...ev, profile_id: null })));
    } catch (e) {
      results.traktError = e.message;
      console.error('[SYNC] Trakt error:', e.message);
    }
  }

  return results;
}
