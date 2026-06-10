import { supabase } from './supabase.js';
import { fetchCredits, fetchTmdbDetails, searchTmdbByTitle } from './tmdbService.js';
import { isAnimeByKitsu } from './kitsuService.js';
import type { TraktEvent, InsightSummary } from '../types.js';

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

function runtime(e: TraktEvent): number {
  if (e.runtime_minutes) return e.runtime_minutes;
  if (e.trakt_type === 'movie') return DEFAULT_RUNTIME_MOVIE;
  return DEFAULT_RUNTIME_EPISODE;
}

export function computeStreak(events: TraktEvent[]): number {
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

export function computePeakHour(events: TraktEvent[]): { hour: number; count: number } | null {
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

export function computeWeekdayPattern(events: TraktEvent[]): { day: number; count: number }[] {
  const dayMap: Record<number, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const day = new Date(e.watched_at).getDay();
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  return Object.entries(dayMap).map(([d, c]) => ({ day: parseInt(d), count: c })).sort((a, b) => b.count - a.count);
}

export function findBingeSessions(events: TraktEvent[]): { title: string; episodes: number; date: string; tmdb_id: number | null }[] {
  const dayShow: Record<string, Record<string, { count: number; tmdb_id: number | null }>> = {};
  for (const e of events) {
    if (e.trakt_type === 'movie' || !e.watched_at) continue;
    const date = e.watched_at.substring(0, 10);
    dayShow[date] = dayShow[date] || {};
    if (!dayShow[date][e.title]) {
      dayShow[date][e.title] = { count: 0, tmdb_id: e.tmdb_id || null };
    }
    dayShow[date][e.title].count++;
  }
  const binges: { title: string; episodes: number; date: string; tmdb_id: number | null }[] = [];
  for (const [date, shows] of Object.entries(dayShow)) {
    for (const [title, info] of Object.entries(shows)) {
      if (info.count >= 3) binges.push({ title, episodes: info.count, date, tmdb_id: info.tmdb_id });
    }
  }
  return binges.sort((a, b) => b.episodes - a.episodes);
}

export function findDroppedShows(events: TraktEvent[]): { title: string; lastDate: string; totalEpisodes: number; tmdb_id: number | null }[] {
  const showEpisodes: Record<string, { dates: string[]; lastDate: string; tmdb_id: number | null }> = {};
  for (const e of events) {
    if (e.trakt_type === 'movie' || !e.watched_at) continue;
    if (!showEpisodes[e.title]) showEpisodes[e.title] = { dates: [], lastDate: '', tmdb_id: e.tmdb_id || null };
    showEpisodes[e.title].dates.push(e.watched_at);
  }
  const now = Date.now();
  const threeMonths = 90 * DAY_MS;
  const dropped: { title: string; lastDate: string; totalEpisodes: number; tmdb_id: number | null }[] = [];
  for (const [title, info] of Object.entries(showEpisodes)) {
    info.dates.sort();
    const lastWatch = new Date(info.dates[info.dates.length - 1]).getTime();
    if (now - lastWatch > threeMonths && info.dates.length >= 3) {
      dropped.push({ title, lastDate: info.dates[info.dates.length - 1], totalEpisodes: info.dates.length, tmdb_id: info.tmdb_id });
    }
  }
  return dropped.sort((a, b) => b.totalEpisodes - a.totalEpisodes);
}

export function computeTraktStats(events: TraktEvent[], apiStats?: { movies: { plays: number; minutes: number }; episodes: { plays: number; minutes: number } }) {
  const now = Date.now();
  const yearStart = now - YEAR_MS;
  const weekStart = now - WEEK_MS;
  const monthStart = now - MONTH_MS;
  const prevMonthStart = now - 2 * MONTH_MS;

  const movies = events.filter((e) => e.trakt_type === 'movie');
  const episodes = events.filter((e) => e.trakt_type !== 'movie');
  const anime = events.filter((e) => (e.genres || []).includes('anime'));
  const animeMovies = anime.filter(e => e.trakt_type === 'movie');
  const animeEpisodes = anime.filter(e => e.trakt_type !== 'movie');
  const series = episodes.filter(e => !(e.genres || []).includes('anime'));

  const totalHours = apiStats
    ? (apiStats.movies.minutes + apiStats.episodes.minutes) / 60
    : events.reduce((sum, e) => sum + runtime(e), 0) / 60;
  const movieHours = apiStats ? apiStats.movies.minutes / 60 : movies.reduce((sum, e) => sum + runtime(e), 0) / 60;
  const showHours = apiStats ? apiStats.episodes.minutes / 60 : episodes.reduce((sum, e) => sum + runtime(e), 0) / 60;
  const totalPlays = apiStats ? apiStats.movies.plays + apiStats.episodes.plays : events.length;
  const yearHours = events.filter((e) => new Date(e.watched_at).getTime() >= yearStart).reduce((sum, e) => sum + runtime(e), 0) / 60;
  const totalMovies = movies.length;
  const totalEpisodes = episodes.length;
  const uniqueTitles = new Set(events.map(e => e.title)).size;
  const animeCount = anime.length;
  const seriesEpisodes = series.length;
  const seriesHours = Math.round(series.reduce((s, e) => s + runtime(e), 0) / 60 * 10) / 10;
  const animeEpisodesCount = animeEpisodes.length;
  const animeMoviesCount = animeMovies.length;

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
  const binges = findBingeSessions(series);
  const dropped = findDroppedShows(series);
  const animeEpOnly = anime.filter(e => e.trakt_type !== 'movie');
  const animeBinges = findBingeSessions(animeEpOnly);
  const animeDropped = findDroppedShows(animeEpOnly);

  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const topDay = weekdayPattern[0] ? { name: dayNames[weekdayPattern[0].day], count: weekdayPattern[0].count } : null;

  const monthCount = events.filter(e => new Date(e.watched_at).getTime() >= monthStart).length;
  const lastMonthCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= prevMonthStart && t < monthStart;
  }).length;

  const weekCount = events.filter(e => new Date(e.watched_at).getTime() >= weekStart).length;

  const uniqueDays = new Set<string>();
  for (const e of events) {
    if (e.watched_at) uniqueDays.add(e.watched_at.substring(0, 10));
  }
  const totalDays = uniqueDays.size;
  const avgPerDay = totalDays > 0 ? Math.round(events.length / totalDays * 10) / 10 : 0;

  const yearlyTotals: Record<string, { hours: number; movies: number; episodes: number }> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const year = new Date(e.watched_at).getFullYear().toString();
    if (!yearlyTotals[year]) yearlyTotals[year] = { hours: 0, movies: 0, episodes: 0 };
    yearlyTotals[year].hours += runtime(e) / 60;
    if (e.trakt_type === 'movie') yearlyTotals[year].movies++;
    else yearlyTotals[year].episodes++;
  }
  for (const y of Object.keys(yearlyTotals)) {
    yearlyTotals[y].hours = Math.round(yearlyTotals[y].hours * 10) / 10;
  }

  const bestYear = Object.entries(yearlyTotals).sort((a, b) => b[1].hours - a[1].hours)[0]?.[0] || null;

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const monthMap: Record<string, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const m = new Date(e.watched_at).getMonth();
    monthMap[monthNames[m]] = (monthMap[monthNames[m]] || 0) + 1;
  }
  const bestMonth = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const totalHoursByYear: Record<string, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const year = new Date(e.watched_at).getFullYear().toString();
    totalHoursByYear[year] = (totalHoursByYear[year] || 0) + runtime(e) / 60;
  }
  for (const y of Object.keys(totalHoursByYear)) {
    totalHoursByYear[y] = Math.round(totalHoursByYear[y] * 10) / 10;
  }

  const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const e of events) {
    if (!e.watched_at) continue;
    const h = new Date(e.watched_at).getHours();
    if (h >= 6 && h < 12) timeOfDay.morning++;
    else if (h >= 12 && h < 18) timeOfDay.afternoon++;
    else if (h >= 18) timeOfDay.evening++;
    else timeOfDay.night++;
  }

  const seasonalTitles = findSeasonalTitles(events);

  const totalWatched = totalMovies + totalEpisodes;
  const moviePct = totalWatched > 0 ? Math.round(totalMovies / totalWatched * 100) : 50;
  const showPct = totalWatched > 0 ? 100 - moviePct : 50;

  const weekEvents = events.filter(e => new Date(e.watched_at).getTime() >= weekStart);
  const prevWeekStart = weekStart - WEEK_MS;
  const prevWeekCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= prevWeekStart && t < weekStart;
  }).length;

  const weekdayEvts = events.filter(e => {
    if (!e.watched_at) return false;
    const day = new Date(e.watched_at).getDay();
    return day >= 1 && day <= 5;
  });
  const weekendEvts = events.filter(e => {
    if (!e.watched_at) return false;
    const day = new Date(e.watched_at).getDay();
    return day === 0 || day === 6;
  });
  const weekdayPct = totalWatched > 0 ? Math.round(weekdayEvts.length / totalWatched * 100) : 50;
  const weekendPct = 100 - weekdayPct;

  const uniqueWeeks = new Set<string>();
  for (const e of events) {
    if (!e.watched_at) continue;
    const d = new Date(e.watched_at);
    const weekKey = `${d.getFullYear()}-W${String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000)).padStart(2, '0')}`;
    uniqueWeeks.add(weekKey);
  }
  const totalWeeks = uniqueWeeks.size || 1;
  const avgPerWeek = Math.round(totalWatched / totalWeeks * 10) / 10;

  const yearAgo = now - YEAR_MS;
  const twoYearsAgo = yearAgo - YEAR_MS;
  const lastYearCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= yearAgo && t < now;
  }).length;
  const prevYearCount = events.filter(e => {
    const t = new Date(e.watched_at).getTime();
    return t >= twoYearsAgo && t < yearAgo;
  }).length;
  const yoyChange = prevYearCount > 0 ? Math.round((lastYearCount - prevYearCount) / prevYearCount * 100) : 0;

  const primeTime = events.filter(e => {
    if (!e.watched_at) return false;
    const h = new Date(e.watched_at).getHours();
    return h >= 20 || h < 2;
  }).length;
  const primeTimePct = totalWatched > 0 ? Math.round(primeTime / totalWatched * 100) : 0;

  // Decade più attivo
  const decadeCounts: Record<string, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const year = new Date(e.watched_at).getFullYear();
    const decade = Math.floor(year / 10) * 10;
    decadeCounts[String(decade)] = (decadeCounts[String(decade)] || 0) + 1;
  }
  const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const decadeEvents = topDecade ? decadeCounts[topDecade] : 0;

  // Pausa massima
  const sortedDates = events.map(e => e.watched_at).filter(Boolean).sort() as string[];
  let longestBreak = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / DAY_MS;
    if (gap > longestBreak) longestBreak = gap;
  }
  const maxBreak = Math.round(longestBreak);

  // Durata media contenuti
  const allRuntimes = events.map(e => runtime(e)).filter(r => r > 0);
  const avgRuntime = allRuntimes.length > 0 ? Math.round(allRuntimes.reduce((a, b) => a + b, 0) / allRuntimes.length) : 0;

  // Percentuale notturna (0-6)
  const nightCount = events.filter(e => {
    if (!e.watched_at) return false;
    const h = new Date(e.watched_at).getHours();
    return h >= 0 && h < 6;
  }).length;
  const nightPct = totalWatched > 0 ? Math.round(nightCount / totalWatched * 100) : 0;

  // Statistiche anime aggiuntive
  const animeStreak = computeStreak(anime);
  const animePeakHour = computePeakHour(anime);
  const animeUniqueTitles = new Set(anime.map(e => e.title)).size;
  const animeTotalDays = new Set(anime.filter(e => e.watched_at).map(e => e.watched_at.substring(0, 10))).size;
  const animeAvgPerDay = animeTotalDays > 0 ? Math.round(anime.length / animeTotalDays * 10) / 10 : 0;
  const animePct = totalWatched > 0 ? Math.round(anime.length / totalWatched * 100) : 0;
  const animeWeekdayPattern = computeWeekdayPattern(anime);

  // Serie uniche e media episodi per show
  const showEpisodeMap: Record<string, number> = {};
  for (const e of series) {
    const showTitle = e.payload?.show?.title || null;
    if (showTitle) showEpisodeMap[showTitle] = (showEpisodeMap[showTitle] || 0) + 1;
  }
  const uniqueShows = Object.keys(showEpisodeMap);
  const avgEpisodesPerShow = uniqueShows.length > 0
    ? Math.round(Object.values(showEpisodeMap).reduce((a, b) => a + b, 0) / uniqueShows.length * 10) / 10
    : 0;

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
    movieHours: Math.round(movieHours * 10) / 10,
    episodeHours: Math.round(showHours * 10) / 10,
    animeCount,
    animeHours: Math.round(anime.reduce((s, e) => s + runtime(e), 0) / 60 * 10) / 10,
    seriesEpisodes,
    seriesHours,
    animeEpisodes: animeEpisodesCount,
    animeMovies: animeMoviesCount,
    animeStreak,
    animePeakHour,
    animeUniqueTitles,
    animeTotalDays,
    animeAvgPerDay,
    animePct,
    totalDays,
    avgPerDay,
    yearlyTotals,
    bestYear,
    bestMonth,
    totalHoursByYear,
    seasonalTitles,
    timeOfDay,
    moviePct,
    showPct,
    animeBinges,
    animeDropped,
    weekCount,
    prevWeekCount,
    weekdayPct,
    weekendPct,
    avgPerWeek,
    lastYearCount,
    prevYearCount,
    yoyChange,
    primeTimePct,
    topDecade,
    decadeEvents,
    maxBreak,
    avgRuntime,
    nightPct,
    uniqueShows: uniqueShows.length,
    avgEpisodesPerShow
  };
}

export function findRecurringTitles(events: TraktEvent[]) {
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
  return recurring.sort((a, b) => b.count - a.count);
}

export function findRewatchTitles(events: TraktEvent[]) {
  const keyInfo: Record<string, { title: string; count: number; tmdb_id: number | null; type: string }> = {};
  for (const e of events) {
    const key = e.tmdb_id ? `${e.trakt_type}_${e.tmdb_id}` : (e.trakt_id || e.title);
    if (!keyInfo[key]) {
      keyInfo[key] = { title: e.title, count: 0, tmdb_id: e.tmdb_id || null, type: e.trakt_type };
    }
    keyInfo[key].count++;
  }
  return Object.entries(keyInfo)
    .filter(([_, info]) => info.count >= 2)
    .map(([_, info]) => ({ title: info.title, count: info.count, tmdb_id: info.tmdb_id, type: info.type }))
    .sort((a, b) => b.count - a.count);
}

export function findSeasonalTitles(events: TraktEvent[], now = new Date()): { title: string; count: number }[] {
  const month = now.getUTCMonth() + 1;
  let seasonMonths: number[];
  if (month >= 6 && month <= 8) seasonMonths = [6, 7, 8];
  else if (month === 10) seasonMonths = [10];
  else if (month === 12) seasonMonths = [12];
  else seasonMonths = [month];

  const titles: Record<string, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const d = new Date(e.watched_at);
    const m = d.getUTCMonth() + 1;
    const y = d.getUTCFullYear();
    if (seasonMonths.includes(m) && y < now.getUTCFullYear()) {
      titles[e.title] = (titles[e.title] || 0) + 1;
    }
  }
  return Object.entries(titles)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}

export function findMemories(events: TraktEvent[], now = new Date()): { year: number; title: string; tmdb_id: number | null; type: string }[] {
  const memories: { year: number; title: string; tmdb_id: number | null; type: string }[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    if (!e.watched_at) continue;
    const d = new Date(e.watched_at);
    const year = d.getUTCFullYear();
    if (year >= now.getUTCFullYear()) continue;

    const eventRef = new Date(2000, d.getUTCMonth(), d.getUTCDate());
    const todayRef = new Date(2000, now.getUTCMonth(), now.getUTCDate());
    const diff = Math.round((eventRef.getTime() - todayRef.getTime()) / DAY_MS);

    if (Math.abs(diff) <= 3) {
      const key = `${year}_${e.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        memories.push({ year, title: e.title, tmdb_id: e.tmdb_id || null, type: e.trakt_type });
      }
    }
  }

  return memories.sort((a, b) => b.year - a.year);
}

export async function computeTopPeople(events: TraktEvent[]): Promise<{ actors: { name: string; count: number }[]; directors: { name: string; count: number }[]; writers: { name: string; count: number }[] }> {
  // Risolvi TMDB ID mancanti via ricerca TMDB
  const missingMap = new Map<string, { title: string; type: 'movie' | 'tv'; year: number | null; weight: number }>();
  const seenMap = new Map<string, { tmdb_id: string; type: 'movie' | 'tv'; weight: number }>();
  for (const e of events) {
    if (e.tmdb_id) {
      const tid = String(e.tmdb_id);
      const existing = seenMap.get(tid);
      if (existing) existing.weight++;
      else seenMap.set(tid, { tmdb_id: tid, type: e.trakt_type === 'movie' ? 'movie' : 'tv', weight: 1 });
    } else if (e.title) {
      const key = `${(e.trakt_type || 'movie')}_${e.title.toLowerCase().trim()}`;
      const existing = missingMap.get(key);
      if (existing) existing.weight++;
      else missingMap.set(key, { title: e.title, type: e.trakt_type === 'movie' ? 'movie' : 'tv', year: e.year || null, weight: 1 });
    }
  }

  // Cerca TMDB per titoli senza ID (batch 5 con cache)
  const tmdbSearchCache = new Map<string, string | null>();
  const missing = [...missingMap.values()];
  for (let i = 0; i < missing.length; i += 5) {
    const chunk = missing.slice(i, i + 5);
    const results = await Promise.allSettled(
      chunk.map(item => searchTmdbByTitle(item.title, item.type, item.year))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const item = chunk[j];
      const key = `${item.type}_${item.title.toLowerCase().trim()}`;
      if (r.status === 'fulfilled' && r.value) {
        tmdbSearchCache.set(key, r.value);
        const existing = seenMap.get(r.value);
        if (existing) existing.weight += item.weight;
        else seenMap.set(r.value, { tmdb_id: r.value, type: item.type, weight: item.weight });
      } else {
        tmdbSearchCache.set(key, null);
      }
    }
    if (i + 5 < missing.length) await new Promise(r => setTimeout(r, 30));
  }

  const all = [...seenMap.values()].sort((a, b) => b.weight - a.weight);

  const actorCount: Record<string, number> = {};
  const directorCount: Record<string, number> = {};
  const writerCount: Record<string, number> = {};

  const batchSize = 10;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(item => fetchCredits(item.tmdb_id, item.type))
    );
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const item = batch[j];
      if (result.status === 'fulfilled' && result.value) {
        const credits = result.value as { cast: string[]; crew: { directors: string[]; writers: string[] } };
        const w = item.weight;
        for (const actor of credits.cast) {
          actorCount[actor] = (actorCount[actor] || 0) + w;
        }
        for (const director of credits.crew.directors) {
          directorCount[director] = (directorCount[director] || 0) + w;
        }
        for (const writer of credits.crew.writers || []) {
          writerCount[writer] = (writerCount[writer] || 0) + w;
        }
      }
    }
  }

  return {
    actors: Object.entries(actorCount).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count),
    directors: Object.entries(directorCount).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count),
    writers: Object.entries(writerCount).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count)
  };
}

export async function computeRankings(configId: string, stats: { totalHours: number; totalMovies: number; totalEpisodes: number; streak: number }) {
  const { data: snapshots } = await supabase
    .from('insight_snapshots')
    .select('config_id, summary');
  if (!snapshots) return null;

  // Prendi solo i config che hanno un trakt_username (utenti reali, non test)
  const { data: configs } = await supabase
    .from('addon_configs')
    .select('id')
    .not('trakt_username', 'is', null);
  const activeConfigIds = new Set((configs || []).map(c => c.id));

  const entries = (snapshots as { config_id: string; summary: Record<string, any> }[])
    .filter(s =>
      s.summary &&
      s.summary.totalHours > 0 &&
      activeConfigIds.has(s.config_id)
    )
    .map(s => ({
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
    topHours: entries.slice(0, 20).map(e => e.totalHours)
  };
}

export async function enrichEventsWithTmdbAnime(events: TraktEvent[]): Promise<{ events: TraktEvent[]; animeTmdbIds: number[] }> {
  const unique = new Map<string, { tmdb_id: string; type: string }>();
  const ANIME_GENRE_ID = 16;

  for (const e of events) {
    if (e.tmdb_id && !unique.has(String(e.tmdb_id))) {
      unique.set(String(e.tmdb_id), {
        tmdb_id: String(e.tmdb_id),
        type: e.trakt_type === 'movie' ? 'movie' : 'tv'
      });
    }
  }

  const animeSet = new Set<string>();
  const batch = [...unique.values()];
  for (let i = 0; i < batch.length; i += 10) {
    const chunk = batch.slice(i, i + 10);
    const results = await Promise.allSettled(
      chunk.map(item => fetchTmdbDetails(item.tmdb_id, item.type))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const item = chunk[j];
      if (r.status === 'fulfilled' && r.value) {
        const isAnime = r.value.originalLanguage === 'ja' && r.value.genres.includes(ANIME_GENRE_ID);
        if (isAnime) {
          animeSet.add(item.tmdb_id);
        } else if (r.value.originalLanguage === 'ja') {
          try {
            const kitsuHit = await isAnimeByKitsu(item.tmdb_id, item.type);
            if (kitsuHit) animeSet.add(item.tmdb_id);
          } catch {}
        }
      } else if (r.status === 'rejected') {
        try {
          const kitsuHit = await isAnimeByKitsu(item.tmdb_id, item.type);
          if (kitsuHit) animeSet.add(item.tmdb_id);
        } catch {}
      }
    }
    if (i + 10 < batch.length) await new Promise(r => setTimeout(r, 20));
  }

  const enriched = events.map(e => {
    if (e.tmdb_id && animeSet.has(String(e.tmdb_id))) {
      const g = e.genres || [];
      if (!g.includes('anime')) g.push('anime');
      return { ...e, genres: g };
    }
    return e;
  });

  const animeTmdbIds = [...animeSet].map(Number).filter(Boolean);
  return { events: enriched, animeTmdbIds };
}

export async function computeAdaptiveInsights(configId: string, accessToken?: string, traktUsername?: string) {
  const { data: events, error: evErr } = await supabase
    .from('trakt_events')
    .select('*')
    .eq('config_id', configId);

  if (evErr && String(evErr).includes('does not exist')) {
    throw new Error('Tabella "trakt_events" non esiste. Esegui supabase/init.sql.');
  }

  if (!events || events.length === 0) {
    await safeUpsert(configId, {
      config_id: configId,
      taste_profile: 'mixed',
      seasonal_key: 'standard',
      summary: { memories: [], seriesRewatch: [], animeRewatch: [], animeBinges: [], animeDropped: [], animeTmdbIds: [] },
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

  let apiStats = undefined;
  if (accessToken && traktUsername) {
    try {
      const { getUserStats } = await import('./trakt.js');
      apiStats = await getUserStats(accessToken, traktUsername);
    } catch {}
  }

  const { events: enriched, animeTmdbIds } = await enrichEventsWithTmdbAnime(events);
  const stats = computeTraktStats(enriched, apiStats || undefined);
  const recurring = findRecurringTitles(enriched);
  const rewatch = findRewatchTitles(enriched);

  const animeEvents = enriched.filter(e => (e.genres || []).includes('anime'));
  const seriesEvents = enriched.filter(e => e.trakt_type !== 'movie' && !(e.genres || []).includes('anime'));
  const seriesRewatch = findRewatchTitles(seriesEvents);
  const animeRewatch = findRewatchTitles(animeEvents);

  const season = getSeasonalContext();
  const memories = findMemories(enriched);

  let topActors: { name: string; count: number }[] = [];
  let topDirectors: { name: string; count: number }[] = [];
  let topWriters: { name: string; count: number }[] = [];
  try {
    const people = await computeTopPeople(enriched);
    topActors = people.actors;
    topDirectors = people.directors;
    topWriters = people.writers;
  } catch (err) {
    // TMDB non configurato o errore di rete
  }

  let ranking: { totalUsers: number; hoursRank: number; streakRank: number; contentRank: number; topHours: number[] } | null = null;
  try {
    ranking = await computeRankings(configId, stats);
  } catch (err) {
    // errore ranking
  }

  const firstPlay = computeFirstPlay(enriched);
  const playsByMonth = computePlaysByMonth(enriched);
  const contentByYear = computeContentByYear(enriched);
  const primeTimePct = stats.primeTimePct ?? 0;

  try {
    await safeUpsert(configId, {
      config_id: configId,
      taste_profile: 'mixed',
      seasonal_key: season.seasonKey,
      summary: {
        ...stats,
        memories,
        seriesRewatch,
        animeRewatch,
        animeTmdbIds
      },
      first_play: firstPlay,
      plays_by_month: playsByMonth,
      content_by_year: contentByYear,
      recurring_titles: recurring,
      rewatch_titles: rewatch,
      genre_counts: stats.genre_counts,
      top_actors: topActors,
      top_directors: topDirectors,
      top_writers: topWriters,
      ranking,
      generated_at: new Date().toISOString()
    });
  } catch {
    // Se l'upsert completo fallisce (colonne mancanti), salva un payload minimo
    console.error('safeUpsert completo fallito, salvo payload minimo');
    await safeUpsertMinimal(configId, {
      config_id: configId,
      taste_profile: 'mixed',
      seasonal_key: season.seasonKey,
      summary: {
        ...stats,
        memories,
        seriesRewatch,
        animeRewatch,
        animeTmdbIds
      },
      recurring_titles: recurring,
      rewatch_titles: rewatch,
      genre_counts: stats.genre_counts,
      top_actors: topActors,
      top_directors: topDirectors,
      ranking,
      generated_at: new Date().toISOString()
    });
  }
}

function computeFirstPlay(events: TraktEvent[]): { title: string; date: string; tmdb_id: number | null } | null {
  let earliest: string | null = null;
  let title = '';
  let tmdbId: number | null = null;
  for (const e of events) {
    if (!e.watched_at) continue;
    if (!earliest || e.watched_at < earliest) {
      earliest = e.watched_at;
      title = e.title;
      tmdbId = e.tmdb_id || null;
    }
  }
  if (!earliest) return null;
  return { title, date: earliest, tmdb_id: tmdbId };
}

function computePlaysByMonth(events: TraktEvent[]): { month: string; count: number }[] {
  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const counts: number[] = new Array(12).fill(0);
  for (const e of events) {
    if (!e.watched_at) continue;
    const m = new Date(e.watched_at).getMonth();
    counts[m]++;
  }
  return monthNames.map((month, i) => ({ month, count: counts[i] }));
}

function computeContentByYear(events: TraktEvent[]): { year: number; count: number }[] {
  const yearCounts: Record<number, number> = {};
  for (const e of events) {
    if (!e.watched_at) continue;
    const y = new Date(e.watched_at).getFullYear();
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  }
  return Object.entries(yearCounts)
    .map(([y, c]) => ({ year: parseInt(y), count: c }))
    .sort((a, b) => a.year - b.year);
}

async function safeUpsert(configId: string, payload: Record<string, any>) {
  if (!payload) return;
  const { error: firstErr } = await supabase.from('insight_snapshots').upsert(payload, { onConflict: 'config_id' });
  if (!firstErr) return;
  const msg = firstErr?.message || JSON.stringify(firstErr);
  if (msg.includes('does not exist')) {
    console.error(`ERRORE: Tabella "insight_snapshots" non esiste! Esegui supabase/init.sql.`, msg);
    throw new Error('Database tables missing. Run supabase/init.sql in Supabase SQL Editor.');
  }
  if (msg.includes('does not exist') || msg.includes('column') || msg.includes('not exist')) {
    console.error('safeUpsert COLUMN MISSING:', msg);
    throw new Error('Mancano colonne in insight_snapshots. Vai su Supabase SQL Editor ed esegui la migrazione.');
  }
  console.error('safeUpsert error:', firstErr?.message || JSON.stringify(firstErr), firstErr?.details || '', firstErr?.hint || '');
  throw new Error('insight_snapshots upsert failed: ' + msg);
}

async function safeUpsertMinimal(configId: string, payload: Record<string, any>) {
  if (!payload) return;
  const { error } = await supabase.from('insight_snapshots').upsert(payload, { onConflict: 'config_id' });
  if (error) {
    console.error('safeUpsertMinimal fallito:', error?.message || JSON.stringify(error));
    throw new Error('safeUpsertMinimal fallito: ' + (error?.message || JSON.stringify(error)));
  }
}