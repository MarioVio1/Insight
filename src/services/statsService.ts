import { supabase } from './supabase.js';

type EventRow = {
  watched_at: string;
  trakt_type: 'movie' | 'show' | 'episode';
  title: string;
  year: number | null;
  genres: string[] | null;
  runtime_minutes: number | null;
  people: string[] | null;
  trakt_id: string;
  tmdb_id: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
};

function countMap(items: string[]) {
  const map = new Map<string, number>();
  for (const item of items) map.set(item, (map.get(item) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function sameMonthAcrossYears(events: EventRow[]) {
  const grouped = new Map<string, number>();
  for (const e of events) {
    const d = new Date(e.watched_at);
    const key = `${d.getUTCMonth() + 1}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }
  return [...grouped.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

export async function computeStatsSnapshot(configId: string) {
  const { data, error } = await supabase
    .from('trakt_events')
    .select('*')
    .eq('config_id', configId)
    .order('watched_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  const events = (data ?? []) as EventRow[];

  const movies = events.filter(e => e.trakt_type === 'movie');
  const episodes = events.filter(e => e.trakt_type === 'episode');
  const shows = events.filter(e => e.trakt_type === 'show');
  const runtimes = events.map(e => e.runtime_minutes || 0);
  const totalMinutes = runtimes.reduce((a, b) => a + b, 0);
  const genres = countMap(events.flatMap(e => e.genres || []));
  const people = countMap(events.flatMap(e => e.people || []));
  const months = countMap(events.map(e => monthKey(e.watched_at)));
  const topMonth = months[0] || null;
  const recurring = sameMonthAcrossYears(events);
  const rewatches = countMap(events.map(e => e.title)).filter(([, c]) => c > 1).slice(0, 10);

  const snapshot = {
    config_id: configId,
    movies_watched: movies.length,
    episodes_watched: episodes.length,
    shows_started: shows.length,
    total_watch_minutes: totalMinutes,
    top_genre: genres[0]?.[0] ?? null,
    top_person: people[0]?.[0] ?? null,
    top_month: topMonth?.[0] ?? null,
    recurring_month_number: recurring?.[0] ?? null,
    recurring_month_count: recurring?.[1] ?? null,
    rewatches: rewatches.map(([name, count]) => ({ name, count })),
    genre_counts: genres.slice(0, 12).map(([name, count]) => ({ name, count })),
    people_counts: people.slice(0, 12).map(([name, count]) => ({ name, count })),
    generated_at: new Date().toISOString()
  };

  await supabase.from('stats_snapshots').upsert(snapshot, { onConflict: 'config_id' });
  return snapshot;
}
