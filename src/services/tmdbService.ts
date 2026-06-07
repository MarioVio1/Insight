import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

function authHeaders() {
  const token = process.env.TMDB_BEARER_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function searchTmdbMulti(query: string) {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = { query };
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  const { data } = await axios.get(`${TMDB_BASE}/search/multi`, { params, headers: authHeaders() });
  return data?.results?.[0] ?? null;
}

export function tmdbImage(path?: string | null) {
  return path ? `${IMAGE_BASE}${path}` : null;
}

export async function fetchCredits(tmdbId: string, type: 'movie' | 'tv') {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = {};
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const { data } = await axios.get(`${TMDB_BASE}/${type}/${tmdbId}/credits`, { params, headers: authHeaders() });
    const cast = (data.cast || []).slice(0, 10).map((c: any) => c.name).filter(Boolean);
    const directors = (data.crew || [])
      .filter((c: any) => c.job === 'Director' || c.department === 'Directing')
      .map((c: any) => c.name)
      .filter(Boolean);
    return { cast, crew: { directors: [...new Set(directors)] } };
  } catch {
    return null;
  }
}
