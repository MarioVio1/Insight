import axios from 'axios';
import { supabase } from './supabase.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function authHeaders() {
  const token = process.env.TMDB_BEARER_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

type TmdbCacheEntry = {
  poster: string | null;
  rating: number | null;
  genres: number[];
  originalLanguage: string | null;
};

async function getCachedDetails(tmdbId: number | string, type: string): Promise<TmdbCacheEntry | null> {
  try {
    const { data } = await supabase.from('tmdb_cache').select('data, updated_at').eq('tmdb_id', String(tmdbId)).eq('media_type', type).maybeSingle();
    if (data && Date.now() - new Date(data.updated_at).getTime() < CACHE_TTL) return data.data as TmdbCacheEntry;
  } catch {}
  return null;
}

async function setCachedDetails(tmdbId: number | string, type: string, data: TmdbCacheEntry) {
  try {
    await supabase.from('tmdb_cache').upsert({ tmdb_id: String(tmdbId), media_type: type, data, updated_at: new Date().toISOString() }, { onConflict: 'tmdb_id,media_type' });
  } catch {}
}

export async function searchTmdbMulti(query: string) {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = { query };
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  const { data } = await axios.get(`${TMDB_BASE}/search/multi`, { params, headers: authHeaders() });
  return data?.results?.[0] ?? null;
}

export function tmdbImage(path?: string | null) {
  return path ? `${IMAGE_BASE}/w780${path}` : null;
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

export async function fetchTmdbDetails(tmdbId: number | string | null, type: string): Promise<{ poster: string | null; rating: number | null; genres: number[]; originalLanguage: string | null }> {
  if (!tmdbId) return { poster: null, rating: null, genres: [], originalLanguage: null };
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return { poster: null, rating: null, genres: [], originalLanguage: null };
  const cached = await getCachedDetails(tmdbId, type);
  if (cached) return cached;
  const params: Record<string, string> = {};
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  try {
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const { data } = await axios.get(`${TMDB_BASE}/${mediaType}/${tmdbId}`, { params, headers: authHeaders() });
    const poster = data?.poster_path ? `${IMAGE_BASE}/w500${data.poster_path}` : null;
    const rating = data?.vote_average ? Math.round(data.vote_average * 10) / 10 : null;
    const genres: number[] = (data?.genres || []).map((g: any) => g.id);
    const originalLanguage: string | null = data?.original_language || null;
    const result = { poster, rating, genres, originalLanguage };
    await setCachedDetails(tmdbId, type, result);
    return result;
  } catch {
    return { poster: null, rating: null, genres: [], originalLanguage: null };
  }
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
