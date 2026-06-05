import { supabase } from './supabase.js';
import { classifyTaste } from './profileClassifier.js';
import { getSeasonalContext } from './seasonalEngine.js';

function countMap(items: string[]) {
  const map = new Map<string, number>();
  for (const item of items.filter(Boolean)) map.set(item, (map.get(item) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function weekAgo() { return new Date(Date.now() - 7 * 86400000); }
function monthAgo() { return new Date(Date.now() - 30 * 86400000); }

export async function computeAdaptiveInsights(configId: string) {
  const { data, error } = await supabase
    .from('trakt_events')
    .select('*')
    .eq('config_id', configId)
    .order('watched_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  const events = data ?? [];
  const taste = classifyTaste(events);
  const seasonal = getSeasonalContext();
  const now = new Date();
  const lastWeek = events.filter((e: any) => new Date(e.watched_at) >= weekAgo());
  const lastMonth = events.filter((e: any) => new Date(e.watched_at) >= monthAgo());
  const movieCount = events.filter((e: any) => e.trakt_type === 'movie').length;
  const episodeCount = events.filter((e: any) => e.trakt_type !== 'movie').length;
  const totalMinutes = events.reduce((a: number, e: any) => a + (e.runtime_minutes || 0), 0);
  const genres = countMap(events.flatMap((e: any) => e.genres || []));
  const weeklyTitles = countMap(lastWeek.map((e: any) => e.title));
  const yearlyMonthEvents = events.filter((e: any) => new Date(e.watched_at).getUTCMonth() === now.getUTCMonth());
  const monthTitles = countMap(yearlyMonthEvents.map((e: any) => e.title)).slice(0, 6);
  const topGenre = genres[0]?.[0] || null;
  const topWeekly = weeklyTitles[0] || null;
  const repeated = countMap(events.map((e: any) => e.title)).filter(([, c]) => c > 1).slice(0, 8);

  const insightPayload = {
    config_id: configId,
    taste_profile: taste,
    seasonal_key: seasonal.seasonKey,
    summary: {
      movieCount,
      episodeCount,
      totalHours: Math.round(totalMinutes / 60),
      topGenre,
      lastWeekCount: lastWeek.length,
      lastMonthCount: lastMonth.length,
      topWeeklyTitle: topWeekly?.[0] || null,
      topWeeklyCount: topWeekly?.[1] || null
    },
    recurring_titles: monthTitles.map(([title, count]) => ({ title, count })),
    rewatch_titles: repeated.map(([title, count]) => ({ title, count })),
    genre_counts: genres.slice(0, 12).map(([name, count]) => ({ name, count })),
    generated_at: new Date().toISOString()
  };

  await supabase.from('insight_snapshots').upsert(insightPayload, { onConflict: 'config_id' });
  return insightPayload;
}
