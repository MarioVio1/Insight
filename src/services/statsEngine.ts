import { supabase } from './supabase.js';
import { fetchCredits } from './tmdbService.js';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const DEFAULT_RUNTIME_MOVIE = 90;
const DEFAULT_RUNTIME_EPISODE = 22;

export function getSeasonalContext(now = new Date()) {
  const month = now.getUTCMonth() + 1;
  if (month === 10) return { seasonKey: 'halloween', label: 'Halloween Season', accent: '#f97316' };
  if (month === 12) return { seasonKey: 'christmas', label: 'Christmas Season', accent: '#dc2626' };
  if (month >= 6 && month <= 8) return { seasonKey: 'summer', label: 'Summer Rewatch Season', accent: '#f59e0b' };
  return { seasonKey: 'standard', label: 'Current Highlights', accent: '#0ea5e9' };
}

function runtime(e: any): number {
  if (e.runtime_minutes) return e.runtime_minutes;
  if (e.trakt_type === 'movie') return DEFAULT_RUNTIME_MOVIE;
  return DEFAULT_RUNTIME_EPISODE;
}

export function computeStreak(events: any[]): number {
  const days = new Set<string>();
  for (const e of events) {
    if (e.watched_at) days.add(e.watched_at.substring(0, 10));
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    if (days.has(key)) streak++;
    else break;
  }
  return streak;
}

export function computePeakHour(events: any[]): { hour: number; count: number } | null {
  const hourMap: Record<number, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const h = new Date(e.watched_at).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  }
  const entries = Object.entries(hourMap).map(([h, c]) => ({ hour: parseInt(h), count: c }));
  entries.sort((a, b) => b.count - a.count);
  return entries[0] || null;
}

export function computeWeekdayPattern(events: any[]): { day: number; count: number }[] {
  const dayMap: Record<number, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const day = new Date(e.watched_at).getDay();
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  return Object.entries(dayMap).map(([d, c]) => ({ day: parseInt(d), count: c })).sort((a, b) => b.count - a.count);
}

export function findBingeSessions(events: any[]): { title: string; episodes: number; date: string }[] {
  const dayShow: Record<string, Record<string, number>> = {};
  for (const e of events) {
    if (e.trakt_type === 'movie' || !e.watched_at) continue;
    const date = e.watched_at.substring(0, 10);
    dayShow[date] = dayShow[date] || {};
    dayShow[date][e.title] = (dayShow[date][e.title] || 0) + 1;
  }
  const binges: { title: string; episodes: number; date: string }[] = [];
  for (const [date, shows] of Object.entries(dayShow)) {
    for (const [title, count] of Object.entries(shows)) {
      if (count >= 3) binges.push({ title, episodes: count, date });
    }
  }
  return binges.sort((a, b) => b.episodes - a.episodes).slice(0, 10);
}

export function findDroppedShows(events: any[]): { title: string; lastDate: string; totalEpisodes: number }[] {
  const showEpisodes: Record<string, { dates: string[]; lastDate: string }> = {};
  for (const e of events) {
    if (e.trakt_type === 'movie' || !e.watched_at) continue;
    if (!showEpisodes[e.title]) showEpisodes[e.title] = { dates: [], lastDate: '' };
    showEpisodes[e.title].dates.push(e.watched_at);
  }
  const now = Date.now();
  const threeMonths = 90 * DAY_MS;
  const dropped: { title: string; lastDate: string; totalEpisodes: number }[] = [];
  for (const [title, info] of Object.entries(showEpisodes)) {
    info.dates.sort();
    const lastWatch = new Date(info.dates[info.dates.length - 1]).getTime();
    if (now - lastWatch > threeMonths && info.dates.length >= 3) {
      dropped.push({ title, lastDate: info.dates[info.dates.length - 1], totalEpisodes: info.dates.length });
    }
  }
  return dropped.sort((a, b) => b.totalEpisodes - a.totalEpisodes).slice(0, 10);
}

export function computeTraktStats(events: any[]) {
  const now = Date.now();
  const yearStart = now - YEAR_MS;
  const weekStart = now - WEEK_MS;
  const monthStart = now - MONTH_MS;
  const prevMonthStart = now - 2 * MONTH_MS;

  const movies = events.filter((e) => e.trakt_type === 'movie');
  const episodes = events.filter((e) => e.trakt_type !== 'movie');
  const anime = events.filter((e) => (e.genres || []).includes('anime'));

  const totalHours = events.reduce((sum, e) => sum + runtime(e), 0) / 60;
  const yearHours = events.filter((e) => new Date(e.watched_at).getTime() >= yearStart).reduce((sum, e) => sum + runtime(e), 0) / 60;
  const totalMovies = movies.length;
  const totalEpisodes = episodes.length;
  const uniqueTitles = new Set(events.map(e => e.title)).size;
  const animeCount = anime.length;

  const genreCounts: Record<string, number> = {};
  for (const e of events) {
    for (const g of (e.genres || [])) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }
  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0] || null;
  const genreCountsArr = Object.entries(genreCounts).map(([name, count]) => ({ name, count }));

  const streak = computeStreak(events);
  const peakHour = computePeakHour(events);
  const weekdayPattern = computeWeekdayPattern(events);
  const binges = findBingeSessions(events);
  const dropped = findDroppedShows(events);

  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const topDay = weekdayPattern[0] ? { name: dayNames[weekdayPattern[0].day], count: weekdayPattern[0].count } : null;

  const monthCount = events.filter(e => new Date(e.watched_at).getTime() >= monthStart).length;
  const lastMonthCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= prevMonthStart && t < monthStart;
  }).length;

  const weekCount = events.filter(e => new Date(e.watched_at).getTime() >= weekStart).length;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    yearHours: Math.round(yearHours * 10) / 10,
    totalMovies,
    totalEpisodes,
    uniqueTitles,
    topGenre,
    genre_counts: genreCountsArr,
    streak,
    peakHour,
    topDay,
    binges,
    dropped,
    monthCount,
    lastMonthCount,
    totalEvents: events.length,
    movieHours: Math.round(movies.reduce((s, e) => s + runtime(e), 0) / 60 * 10) / 10,
    episodeHours: Math.round(episodes.reduce((s, e) => s + runtime(e), 0) / 60 * 10) / 10,
    weekCount,
    animeCount,
    animeHours: Math.round(anime.reduce((s, e) => s + runtime(e), 0) / 60 * 10) / 10
  };
}

export function findRecurringTitles(events: any[]) {
  const monthly: Record<string, Record<string, number>> = {};
  for (const e of events) {
    const date = new Date(e.watched_at);
    const month = date.getUTCMonth() + 1;
    monthly[String(month)] = monthly[String(month)] || {};
    monthly[String(month)][e.title] = (monthly[String(month)][e.title] || 0) + 1;
  }
  const seen = new Map<string, { count: number; months: Set<number> }>();
  for (const [month, titles] of Object.entries(monthly)) {
    for (const [title, count] of Object.entries(titles)) {
      if (!seen.has(title)) seen.set(title, { count: 0, months: new Set() });
      const entry = seen.get(title)!;
      entry.count += count;
      entry.months.add(Number(month));
    }
  }
  const recurring: { title: string; count: number; months: number[] }[] = [];
  for (const [title, info] of seen) {
    if (info.count >= 2 && info.months.size >= 2) {
      recurring.push({ title, count: info.count, months: [...info.months].sort() });
    }
  }
  return recurring.sort((a, b) => b.count - a.count).slice(0, 12);
}

export function findRewatchTitles(events: any[]) {
  const titleCounts: Record<string, number> = {};
  for (const e of events) {
    titleCounts[e.title] = (titleCounts[e.title] || 0) + 1;
  }
  return Object.entries(titleCounts)
    .filter(([_, count]) => count >= 2)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export async function computeTopPeople(events: any[]): Promise<{ actors: { name: string; count: number }[]; directors: { name: string; count: number }[] }> {
  const unique = new Map<string, { tmdb_id: string; type: 'movie' | 'tv' }>();
  for (const e of events) {
    const tid = String(e.tmdb_id);
    if (e.tmdb_id && !unique.has(tid)) {
      unique.set(tid, { tmdb_id: tid, type: e.trakt_type === 'movie' ? 'movie' : 'tv' });
    }
  }
  const topN = [...unique.values()].slice(0, 30);
  const actorCount: Record<string, number> = {};
  const directorCount: Record<string, number> = {};

  const batchSize = 5;
  for (let i = 0; i < topN.length; i += batchSize) {
    const batch = topN.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(item => fetchCredits(item.tmdb_id, item.type))
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const credits = result.value as { cast: string[]; crew: { directors: string[] } };
        for (const actor of credits.cast.slice(0, 5)) {
          actorCount[actor] = (actorCount[actor] || 0) + 1;
        }
        for (const director of credits.crew.directors) {
          directorCount[director] = (directorCount[director] || 0) + 1;
        }
      }
    }
  }

  const actors = Object.entries(actorCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const directors = Object.entries(directorCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { actors, directors };
}

export async function computeRankings(configId: string, stats: { totalHours: number; totalMovies: number; totalEpisodes: number; streak: number }) {
  const { data: all } = await supabase
    .from('insight_snapshots')
    .select('config_id, summary');
  if (!all) return null;

  const entries = (all as any[])
    .filter((s: any) => s.summary && s.summary.totalHours != null)
    .map((s: any) => ({
      configId: s.config_id,
      totalHours: s.summary.totalHours as number,
      totalMovies: s.summary.totalMovies as number || 0,
      totalEpisodes: s.summary.totalEpisodes as number || 0,
      streak: s.summary.streak as number || 0
    }));

  entries.sort((a, b) => b.totalHours - a.totalHours);
  const hoursRank = Math.max(0, entries.findIndex(e => e.configId === configId) + 1);
  entries.sort((a, b) => b.streak - a.streak);
  const streakRank = Math.max(0, entries.findIndex(e => e.configId === configId) + 1);
  entries.sort((a, b) => (b.totalMovies + b.totalEpisodes) - (a.totalMovies + a.totalEpisodes));
  const contentRank = Math.max(0, entries.findIndex(e => e.configId === configId) + 1);

  return {
    totalUsers: entries.length,
    hoursRank,
    streakRank,
    contentRank,
    topHours: entries.slice(0, 3).map(e => e.totalHours)
  };
}

export async function computeAdaptiveInsights(configId: string) {
  const { data: events } = await supabase
    .from('trakt_events')
    .select('*')
    .eq('config_id', configId);

  if (!events || events.length === 0) {
    await safeUpsert(configId, {
      config_id: configId,
      taste_profile: 'mixed',
      seasonal_key: 'standard',
      summary: {},
      recurring_titles: [],
      rewatch_titles: [],
      genre_counts: [],
      top_actors: [],
      top_directors: [],
      ranking: null,
      generated_at: new Date().toISOString()
    });
    return;
  }

  const stats = computeTraktStats(events);
  const recurring = findRecurringTitles(events);
  const rewatch = findRewatchTitles(events);
  const season = getSeasonalContext();

  let topActors: { name: string; count: number }[] = [];
  let topDirectors: { name: string; count: number }[] = [];
  try {
    const people = await computeTopPeople(events);
    topActors = people.actors;
    topDirectors = people.directors;
  } catch (err) {
    // TMDB non configurato o errore di rete
  }

  let ranking: any = null;
  try {
    ranking = await computeRankings(configId, stats);
  } catch (err) {
    // errore ranking
  }

  await safeUpsert(configId, {
    config_id: configId,
    taste_profile: 'mixed',
    seasonal_key: season.seasonKey,
    summary: stats,
    recurring_titles: recurring,
    rewatch_titles: rewatch,
    genre_counts: stats.genre_counts,
    top_actors: topActors,
    top_directors: topDirectors,
    ranking,
    generated_at: new Date().toISOString()
  });
}

async function safeUpsert(configId: string, payload: Record<string, any>) {
  if (!payload) return;
  const { error } = await supabase.from('insight_snapshots').upsert(payload, { onConflict: 'config_id' });
  if (!error) return;
  const msg = String(error);
  if (msg.includes('does not exist')) {
    const { top_actors, top_directors, ranking, ...basic } = payload as any;
    const { error: e2 } = await supabase.from('insight_snapshots').upsert(basic, { onConflict: 'config_id' });
    if (e2) console.error('safeUpsert retry error:', String(e2).slice(0, 200));
  } else {
    console.error('safeUpsert error:', msg.slice(0, 200));
  }
}
