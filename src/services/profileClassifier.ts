export type TasteProfile = 'anime-heavy' | 'series-heavy' | 'movie-heavy' | 'rewatch-heavy' | 'mixed';

export function classifyTaste(events: any[]): TasteProfile {
  const animeHits = events.filter((e: any) => /anime|ova|shonen|manga/i.test(JSON.stringify(e.payload || {})) || (e.genres || []).includes('anime')).length;
  const movies = events.filter((e: any) => e.trakt_type === 'movie').length;
  const shows = events.filter((e: any) => e.trakt_type !== 'movie').length;
  const titles = new Map<string, number>();
  for (const e of events) titles.set(e.title, (titles.get(e.title) || 0) + 1);
  const rewatchCount = [...titles.values()].filter(v => v > 1).length;
  if (animeHits >= Math.max(5, events.length * 0.2)) return 'anime-heavy';
  if (rewatchCount >= 5) return 'rewatch-heavy';
  if (shows > movies * 1.4) return 'series-heavy';
  if (movies > shows * 1.4) return 'movie-heavy';
  return 'mixed';
}
