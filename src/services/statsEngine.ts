import { supabase } from './supabase.js';

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function getSeasonalContext(now = new Date()) {
  const month = now.getUTCMonth() + 1;
  if (month === 10) return { seasonKey: 'halloween', label: 'Halloween Season', accent: '#f97316' };
  if (month === 12) return { seasonKey: 'christmas', label: 'Christmas Season', accent: '#dc2626' };
  if (month >= 6 && month <= 8) return { seasonKey: 'summer', label: 'Summer Rewatch Season', accent: '#f59e0b' };
  return { seasonKey: 'standard', label: 'Current Highlights', accent: '#0ea5e9' };
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
  const watchedAts = events.map((e) => new Date(e.watched_at).getTime());
  const now = Date.now();
  const yearStart = now - YEAR_MS;
  const weekStart = now - WEEK_MS;
  const monthStart = now - MONTH_MS;
  const prevMonthStart = now - 2 * MONTH_MS;

  const yearEvents = watchedAts.filter(ts => ts >= yearStart);
  const weekEvents = watchedAts.filter(ts => ts >= weekStart);

  const movies = events.filter((e) => e.trakt_type === 'movie');
  const episodes = events.filter((e) => e.trakt_type !== 'movie');

  const movieCount = yearEvents.length
    ? movies.filter((e) => new Date(e.watched_at).getTime() >= yearStart).length
    : movies.length;
  const episodeCount = yearEvents.length
    ? episodes.filter((e) => new Date(e.watched_at).getTime() >= yearStart).length
    : episodes.length;
  const totalHours = events.reduce((sum, e) => sum + (e.runtime_minutes || 0), 0) / 60;
  const yearHours = yearEvents.length
    ? events.filter((e) => new Date(e.watched_at).getTime() >= yearStart).reduce((sum, e) => sum + (e.runtime_minutes || 0), 0) / 60
    : totalHours;

  const titleCounts: Record<string, { count: number; title: string }> = {};
  for (const e of events) {
    const title = e.title || 'Unknown';
    titleCounts[title] = titleCounts[title] || { count: 0, title };
    titleCounts[title].count++;
  }
  const sortedTitles = Object.values(titleCounts).sort((a, b) => b.count - a.count);
  const topWeeklyTitle = sortedTitles[0]?.title || null;
  const topWeeklyCount = sortedTitles[0]?.count || 0;

  const genreCounts: Record<string, number> = {};
  for (const e of events) {
    for (const g of (e.genres || [])) {
      genreCounts[g] = genreCounts[g] || 0;
      genreCounts[g]++;
    }
  }
  const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0] || null;
  const genreCountsArr = Object.entries(genreCounts).map(([name, count]) => ({ name, count }));

  const lastWeekCount = weekEvents.length;

  const streak = computeStreak(events);
  const peakHour = computePeakHour(events);
  const weekdayPattern = computeWeekdayPattern(events);
  const binges = findBingeSessions(events);
  const dropped = findDroppedShows(events);
  const totalMovies = movies.length;
  const totalEpisodes = episodes.length;
  const uniqueTitles = new Set(events.map(e => e.title)).size;

  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const topDay = weekdayPattern[0] ? { name: dayNames[weekdayPattern[0].day], count: weekdayPattern[0].count } : null;

  const monthCount = events.filter(e => new Date(e.watched_at).getTime() >= monthStart).length;
  const lastMonthCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= prevMonthStart && t < monthStart;
  }).length;

  return {
    movieCount,
    episodeCount,
    totalHours: Math.round(totalHours * 10) / 10,
    yearHours: Math.round(yearHours * 10) / 10,
    topWeeklyTitle,
    topWeeklyCount,
    lastWeekCount,
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
    totalEvents: events.length
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
  const recurring: { title: string; count: number; months: number[] }[] = [];
  const seen = new Map<string, { count: number; months: Set<number> }>();
  for (const [month, titles] of Object.entries(monthly)) {
    for (const [title, count] of Object.entries(titles)) {
      if (!seen.has(title)) seen.set(title, { count: 0, months: new Set() });
      const entry = seen.get(title)!;
      entry.count += count;
      entry.months.add(Number(month));
    }
  }
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

export async function computeAdaptiveInsights(configId: string) {
  const { data: events } = await supabase
    .from('trakt_events')
    .select('*')
    .eq('config_id', configId);

  if (!events || events.length === 0) {
    await supabase.from('insight_snapshots').upsert({
      config_id: configId,
      taste_profile: 'mixed',
      seasonal_key: 'standard',
      summary: {},
      recurring_titles: [],
      rewatch_titles: [],
      genre_counts: [],
      generated_at: new Date().toISOString()
    }, { onConflict: 'config_id' });
    return;
  }

  const stats = computeTraktStats(events);
  const recurring = findRecurringTitles(events);
  const rewatch = findRewatchTitles(events);
  const season = getSeasonalContext();

  await supabase.from('insight_snapshots').upsert({
    config_id: configId,
    taste_profile: 'mixed',
    seasonal_key: season.seasonKey,
    summary: stats,
    recurring_titles: recurring,
    rewatch_titles: rewatch,
    genre_counts: stats.genre_counts,
    generated_at: new Date().toISOString()
  }, { onConflict: 'config_id' });
}
