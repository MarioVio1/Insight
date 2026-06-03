import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

// Fix WebSocket per Node 20 (non ha WebSocket nativo)
// Usiamo createRequire per caricare ws in modo sicuro
const require = createRequire(import.meta.url);
let wsImpl;
try { wsImpl = require('ws'); } catch {}

const supabaseOptions = {
  auth: { persistSession: false },
  ...(wsImpl ? { realtime: { transport: wsImpl } } : {})
};

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  supabaseOptions
);

// ── Utenti ──────────────────────────────────────────
export async function getUserBySlug(slug) {
  const { data } = await supabase.from('ib_users').select('*').eq('slug', slug).maybeSingle();
  return data;
}

export async function upsertUser(slug, extra = {}) {
  const { data, error } = await supabase
    .from('ib_users')
    .upsert({ slug, ...extra, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    .select().single();
  if (error) throw error;
  return data;
}

// ── Profili ─────────────────────────────────────────
export async function getProfiles(userId) {
  const { data } = await supabase.from('ib_profiles').select('*').eq('user_id', userId).order('created_at');
  return data || [];
}

export async function getProfile(userId, slug) {
  const { data } = await supabase.from('ib_profiles').select('*')
    .eq('user_id', userId).eq('slug', slug).maybeSingle();
  return data;
}

export async function upsertProfile(userId, profileInput, extra = {}) {
  const payload = typeof profileInput === 'string'
    ? { user_id: userId, slug: profileInput, ...extra }
    : { user_id: userId, ...(profileInput || {}) };

  if (!payload.slug) throw new Error('profile slug missing');
  if (!payload.name) payload.name = payload.slug;
  if (!payload.emoji) payload.emoji = '🎬';
  if (!payload.color) payload.color = '#01696f';

  const { data, error } = await supabase
    .from('ib_profiles')
    .upsert(payload, { onConflict: 'user_id,slug' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProfile(userId, slug) {
  await supabase.from('ib_profiles').delete().eq('user_id', userId).eq('slug', slug);
}

// ── Watch Events ─────────────────────────────────────
export async function getWatchHistory(userId, profileId, days = 30) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  let q = supabase.from('ib_watch_events').select('*')
    .eq('user_id', userId).gte('watched_at', since)
    .order('watched_at', { ascending: false });
  if (profileId) q = q.eq('profile_id', profileId);
  const { data } = await q;
  return (data || []).map(e => ({ ...e, genres: Array.isArray(e.genres) ? e.genres : [] }));
}

export async function getAllWatchHistory(userId, profileId) {
  let q = supabase.from('ib_watch_events').select('*')
    .eq('user_id', userId).order('watched_at', { ascending: false }).limit(5000);
  if (profileId) q = q.eq('profile_id', profileId);
  const { data } = await q;
  return (data || []).map(e => ({ ...e, genres: Array.isArray(e.genres) ? e.genres : [] }));
}

export async function upsertWatchEvents(userId, events) {
  if (!events?.length) return 0;
  const rows = events.map(e => ({
    user_id: userId,
    profile_id: e.profile_id || null,
    tmdb_id: e.tmdb_id || null,
    imdb_id: e.imdb_id || null,
    title: e.title,
    type: e.type,
    season: e.season || null,
    episode: e.episode || null,
    watched_at: e.watched_at,
    source: e.source || 'trakt',
    runtime_min: e.runtime_min || null,
    progress: e.progress || 100,
    genres: e.genres || []
  }));
  const { error } = await supabase.from('ib_watch_events')
    .upsert(rows, { onConflict: 'user_id,source,watched_at,title', ignoreDuplicates: true });
  if (error) console.error('[DB] upsertWatchEvents:', error.message);
  return rows.length;
}

// ── Insights Cache ────────────────────────────────────
export async function getInsight(userId, profileId, key, days = 30) {
  const { data } = await supabase.from('ib_insights_cache').select('*')
    .eq('user_id', userId)
    .is('profile_id', profileId || null)
    .eq('key', key).eq('period_days', days).maybeSingle();
  return data;
}

export async function setInsight(userId, profileId, key, payload, days = 30) {
  await supabase.from('ib_insights_cache').upsert({
    user_id: userId, profile_id: profileId || null, key,
    period_days: days, payload, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,profile_id,key,period_days' });
}

// ── Goals ─────────────────────────────────────────────
export async function getGoal(userId, profileId) {
  const { data } = await supabase.from('ib_goals').select('*')
    .eq('user_id', userId).is('profile_id', profileId || null).maybeSingle();
  return data;
}

export async function setGoal(userId, profileId, weeklyHoursGoal) {
  const { error } = await supabase.from('ib_goals').upsert({
    user_id: userId, profile_id: profileId || null,
    weekly_hours_goal: weeklyHoursGoal, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,profile_id' });
  if (error) throw error;
}
