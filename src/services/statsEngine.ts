import { supabase } from './supabase.js';

export function getSeasonalContext(now = new Date()) {
  const month = now.getUTCMonth() + 1;

  if (month === 10) {
    return { seasonKey: 'halloween', label: 'Halloween Season', accent: '#f97316' };
  }

  if (month === 12) {
    return { seasonKey: 'christmas', label: 'Christmas Season', accent: '#dc2626' };
  }

  if (month >= 6 && month <= 8) {
    return { seasonKey: 'summer', label: 'Summer Rewatch Season', accent: '#f59e0b' };
  }

  return { seasonKey: 'standard', label: 'Current Highlights', accent: '#0ea5e9' };
}

export function computeTraktStats(events: any[]) {
  const watchedAts = events.map((e) => new Date(e.watch).getTime());
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const week = 7 * 24 * 60 * 60 * 1000;

  const yearStart = now - oneYear;
  const weekStart = now - week;

  const yearEvents = watchedAts.filter(ts => ts >= yearStart);
  const weekEvents = watchedAts.filter(ts => ts >= weekStart);

  const movies = events.filter((e) => e.type === 'movie');
  const episodes = events.filter((e) => e.type === 'episode');

  const movieCount = yearEvents.length ? movies.filter((e) => new Date(e.watch).getTime() >= yearStart).length : movies.length;
  const episodeCount = yearEvents.length ? episodes.filter((e) => new Date(e.watch).getTime() >= yearStart).length : episodes.length;
  const totalHours = yearEvents.length
    ? events.filter((e) => new Date(e.watch).getTime() >= yearStart).reduce((sum, e) => sum + (e.runtime || 0), 0) / 60
    : events.reduce((sum, e) => sum + (e.runtime || 0), 0) / 60;

  const titleCounts: Record<string, { count: number, title: string }> = {};
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

  return {
    movieCount,
    episodeCount,
    totalHours,
    topWeeklyTitle,
    topWeeklyCount,
    lastWeekCount,
    topGenre,
    genre_counts: genreCountsArr
  };
}

export function findRecurringTitles(events: any[]) {
  const monthly: Record<string, Record<string, number>> = {};

  for (const e of events) {
    const date = new Date(e.watch);
    const month = date.getUTCMonth() + 1; // 1-12
    const year = date.getUTCFullYear();
    const key = `${month}`;
    const title = e.title || 'Unknown';

    monthly[key] = monthly[key] || {};
    monthly[key][title] = monthly[key][title] || 0;
    monthly[key][title]++;
  }

  const titleYearCounts: Record<string, Record<number, number>> = {};

  for (const [month, titles] of Object.entries(monthly)) {
    const year = 2000; // dummy year
    for (const [title, count] of Object.entries(titles)) {
      titleYearCounts[title] = titleYearCounts[title] || {};
      titleYearCounts[title][Number(month)] = titleYearCounts[title][Number(month)] || 0;
      titleYearCounts[title][Number(month)] += count;
    }
  }

  const recurring: { title: string; count: number; months: number[] }[] = [];

  for (const [title, monthCounts] of Object.entries(titleYearCounts)) {
    const total = Object.values(monthCounts).reduce((sum, c) => sum + c, 0);
    const months = Object.keys(monthCounts).map(Number);
    if (total >= 2 && months.length >= 2) {
      recurring.push({ title, count: total, months });
    }
  }

  return recurring.sort((a, b) => b.count - a.count).slice(0, 12);
}

export function findRewatchTitles(events: any[]) {
  const titleCounts: Record<string, number> = {};
  for (const e of events) {
    const title = e.title || 'Unknown';
    titleCounts[title] = titleCounts[title] || 0;
    titleCounts[title]++;
  }

  const rewatch = Object.entries(titleCounts)
    .filter(([_, count]) => count >= 2)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return rewatch;
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
