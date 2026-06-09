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

export async function fetchTmdbPoster(tmdbId: number | string | null, type: string): Promise<string | null> {
  if (!tmdbId) return null;
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = {};
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const { data } = await axios.get(`${TMDB_BASE}/${mediaType}/${tmdbId}`, { params, headers: authHeaders() });
    if (data?.poster_path) {
      return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchTmdbDetails(tmdbId: number | string | null, type: string): Promise<{ poster: string | null; rating: number | null; genres: number[]; originalLanguage: string | null; backdrop: string | null }> {
  if (!tmdbId) return { poster: null, rating: null, genres: [], originalLanguage: null, backdrop: null };
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return { poster: null, rating: null, genres: [], originalLanguage: null, backdrop: null };
  const params: Record<string, string> = {};
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const { data } = await axios.get(`${TMDB_BASE}/${mediaType}/${tmdbId}`, { params, headers: authHeaders() });
    const poster = data?.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
    const backdrop = data?.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null;
    const rating = data?.vote_average ? Math.round(data.vote_average * 10) / 10 : null;
    const genres: number[] = (data?.genres || []).map((g: any) => g.id);
    const originalLanguage: string | null = data?.original_language || null;
    return { poster, backdrop, rating, genres, originalLanguage };
  } catch {
    return { poster: null, backdrop: null, rating: null, genres: [], originalLanguage: null };
  }
}

export async function fetchCredits(tmdbId: string, type: 'movie' | 'tv') {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = {};
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const headers = authHeaders();
    const { data } = await axios.get(`${TMDB_BASE}/${type}/${tmdbId}/credits`, { params, headers });
    const cast = (data.cast || []).slice(0, 10).map((c: any) => c.name).filter(Boolean);
    const directors = (data.crew || [])
      .filter((c: any) => c.job === 'Director' || c.department === 'Directing')
      .map((c: any) => c.name)
      .filter(Boolean);

    if (type === 'tv') {
      try {
        const { data: details } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}`, { params, headers });
        const creators = (details.created_by || []).map((c: any) => c.name).filter(Boolean);
        directors.push(...creators);
      } catch {}
    }

    return { cast, crew: { directors: [...new Set(directors)] } };
  } catch {
    return null;
  }
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(data);
}

export async function searchTmdbPerson(query: string): Promise<{ name: string; profile_path: string | null; id: number } | null> {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = { query };
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const { data } = await axios.get(`${TMDB_BASE}/search/person`, { params, headers: authHeaders() });
    if (data?.results?.[0]) {
      return {
        name: data.results[0].name,
        profile_path: data.results[0].profile_path || null,
        id: data.results[0].id
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function tmdbPersonImage(profilePath: string | null): string | null {
  return profilePath ? `https://image.tmdb.org/t/p/w185${profilePath}` : null;
}
