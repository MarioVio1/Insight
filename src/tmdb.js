import 'dotenv/config';

const BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(path, key) {
  const k = key || process.env.TMDB_API_KEY;
  if (!k) return null;
  try {
    const r = await fetch(`${BASE}${path}?api_key=${k}&language=it-IT`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export async function getMovieGenres(tmdbId, key) {
  const data = await tmdbFetch(`/movie/${tmdbId}`, key);
  return data?.genres?.map(g => g.name) || [];
}

export async function getTvGenres(tmdbId, key) {
  const data = await tmdbFetch(`/tv/${tmdbId}`, key);
  return data?.genres?.map(g => g.name) || [];
}

export async function getMoviePoster(tmdbId, key) {
  const data = await tmdbFetch(`/movie/${tmdbId}`, key);
  return data?.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
}

export async function getTvPoster(tmdbId, key) {
  const data = await tmdbFetch(`/tv/${tmdbId}`, key);
  return data?.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
}

export async function enrichEvents(events, tmdbKey) {
  const cache = {};
  const result = [];
  for (const ev of events) {
    if (!ev.tmdb_id || ev.genres?.length > 0) { result.push(ev); continue; }
    const cKey = `${ev.type}:${ev.tmdb_id}`;
    if (!cache[cKey]) {
      const genres = ev.type === 'movie'
        ? await getMovieGenres(ev.tmdb_id, tmdbKey)
        : await getTvGenres(ev.tmdb_id, tmdbKey);
      cache[cKey] = genres;
    }
    result.push({ ...ev, genres: cache[cKey] });
  }
  return result;
}
