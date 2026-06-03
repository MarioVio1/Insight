import { getWatchHistory, getAllWatchHistory, setInsight } from './db.js';

function topN(obj, n = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ name: k, count: v }));
}

export async function computeInsights(userId, profileId, days = 30) {
  const recent = await getWatchHistory(userId, profileId, days);
  const all = await getAllWatchHistory(userId, profileId);

  const movies = recent.filter(e => e.type === 'movie');
  const episodes = recent.filter(e => e.type === 'episode');
  const totalMinutes = recent.reduce((s, e) => s + (e.runtime_min || 0), 0);

  const genreMap = {};
  recent.flatMap(e => e.genres || []).forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1; });
  const topGenres = topN(genreMap);

  const recentGenreMap = {};
  all.slice(0, 10).flatMap(e => e.genres || []).forEach(g => { recentGenreMap[g] = (recentGenreMap[g] || 0) + 1; });
  const moodGenre = Object.entries(recentGenreMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const moodMap = {
    'Action': { label: 'Adrenalinico 💥', icon: '💥' },
    'Comedy': { label: 'In vena di ridere 😂', icon: '😂' },
    'Drama': { label: 'Mood intenso 🎭', icon: '🎭' },
    'Horror': { label: 'Atmosfera dark 👻', icon: '👻' },
    'Science Fiction': { label: 'Curioso 🚀', icon: '🚀' },
    'Romance': { label: 'Romantico 💕', icon: '💕' },
    'Animation': { label: 'Spirito leggero 🎨', icon: '🎨' },
    'Thriller': { label: 'Tensione alta 😰', icon: '😰' },
    'Documentary': { label: 'Curiosità intellettuale 🧠', icon: '🧠' },
    'Fantasy': { label: 'Evasione totale 🧙', icon: '🧙' }
  };
  const mood = moodGenre ? (moodMap[moodGenre] || { label: `${moodGenre} lover`, icon: '🎬' }) : null;

  const seriesEps = {};
  episodes.forEach(e => {
    const k = e.tmdb_id || e.title;
    if (!k) return;
    (seriesEps[k] = seriesEps[k] || []).push(e.watched_at);
  });
  const bingeSeries = Object.entries(seriesEps).filter(([, d]) => d.length >= 3).map(([k]) => k);

  const dropMap = {};
  all.filter(e => e.type === 'episode').forEach(e => {
    const k = e.tmdb_id || e.title;
    if (!k) return;
    if (!dropMap[k] || e.watched_at > dropMap[k].watched_at) dropMap[k] = e;
  });
  const dropped = Object.values(dropMap).filter(e => (e.progress || 100) < 60).slice(0, 10);

  const daysSet = new Set(all.map(e => e.watched_at?.substring(0, 10)).filter(Boolean));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daysSet.has(d.toISOString().substring(0, 10))) streak++;
    else break;
  }

  const hourMap = {};
  all.forEach(e => {
    const h = new Date(e.watched_at).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const topHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];

  const weekMs = 7 * 86400_000;
  const weekAgo = new Date(today - weekMs);
  const weekEvents = all.filter(e => new Date(e.watched_at) > weekAgo);
  const weekMinutes = weekEvents.reduce((s, e) => s + (e.runtime_min || 0), 0);
  const weekHours = Math.round(weekMinutes / 60);

  const payload = {
    computed_at: new Date().toISOString(),
    period_days: days,
    total_titles: recent.length,
    total_minutes: totalMinutes,
    total_hours: Math.round(totalMinutes / 60),
    movies_count: movies.length,
    episodes_count: episodes.length,
    top_genres: topGenres,
    binge_series: bingeSeries.slice(0, 5),
    dropped_series: dropped.map(e => ({ tmdb_id: e.tmdb_id, title: e.title, progress: e.progress })),
    last_watched: all[0] ? { title: all[0].title, type: all[0].type, watched_at: all[0].watched_at } : null,
    streak_days: streak,
    type_breakdown: { movie: movies.length, episode: episodes.length },
    preferred_hour: topHour ? { hour: parseInt(topHour[0]), count: topHour[1] } : null,
    total_all_time: all.length,
    mood,
    week_hours: weekHours
  };

  await setInsight(userId, profileId, 'main', payload, days);
  return payload;
}

export function buildCatalogs(userSlug, profileSlug) {
  const extras = [{ name: 'user', isRequired: true }, { name: 'profile', isRequired: true }];
  return [
    {
      type: 'movie',
      id: 'insightboard-movie',
      name: 'InsightBoard Movies',
      extra: extras
    },
    {
      type: 'series',
      id: 'insightboard-series',
      name: 'InsightBoard Series',
      extra: extras
    }
  ];
}

export function buildMetaPreview(catalogId, insights, userSlug, profileSlug) {
  const base = `${userSlug}/${profileSlug}`;
  const items = [];

  items.push({
    id: `ib:${userSlug}:${profileSlug}:watchtime`,
    type: 'movie',
    name: `⏱️ ${insights.total_hours || 0} ore viste`,
    poster: `/poster/watchtime?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
    background: `/poster/watchtime?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
    description: `Ultimi ${insights.period_days}g: ${insights.total_titles} titoli · ${insights.movies_count} film · ${insights.episodes_count} episodi`,
    genres: ['InsightBoard']
  });

  if (insights.top_genres?.length > 0) {
    items.push({
      id: `ib:${userSlug}:${profileSlug}:topgenre`,
      type: 'movie',
      name: `🎭 Genere top: ${insights.top_genres[0].name}`,
      poster: `/poster/topgenre?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      background: `/poster/topgenre?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      description: insights.top_genres.slice(0, 4).map(g => `${g.name}: ${g.count}`).join(' · '),
      genres: ['InsightBoard']
    });
  }

  items.push({
    id: `ib:${userSlug}:${profileSlug}:streak`,
    type: 'series',
    name: `🔥 Streak: ${insights.streak_days} giorni`,
    poster: `/poster/streak?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
    background: `/poster/streak?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
    description: insights.streak_days > 0 ? `${insights.streak_days} giorni consecutivi a guardare qualcosa!` : 'Nessuna streak.',
    genres: ['InsightBoard']
  });

  if (insights.mood) {
    items.push({
      id: `ib:${userSlug}:${profileSlug}:mood`,
      type: 'series',
      name: `${insights.mood.icon} Mood: ${insights.mood.label}`,
      poster: `/poster/mood?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      background: `/poster/mood?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      description: 'Basato sui titoli recenti.',
      genres: ['InsightBoard']
    });
  }

  if (insights.dropped_series?.length > 0) {
    items.push({
      id: `ib:${userSlug}:${profileSlug}:dropped`,
      type: 'series',
      name: `📌 ${insights.dropped_series.length} serie da riprendere`,
      poster: `/poster/dropped?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      background: `/poster/dropped?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      description: insights.dropped_series.slice(0, 3).map(s => `${s.title} (${s.progress}%)`).join(' · '),
      genres: ['InsightBoard']
    });
  }

  if (insights.binge_series?.length > 0) {
    items.push({
      id: `ib:${userSlug}:${profileSlug}:binge`,
      type: 'series',
      name: `🍿 In binge: ${insights.binge_series.length} serie`,
      poster: `/poster/binge?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      background: `/poster/binge?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`,
      description: insights.binge_series.slice(0, 3).join(' · '),
      genres: ['InsightBoard']
    });
  }

  return items;
}
