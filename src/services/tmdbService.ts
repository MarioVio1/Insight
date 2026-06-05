import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

function authHeaders() {
  const key = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_BEARER_TOKEN;
  if (token) return { Authorization: `Bearer ${token}` };
  if (key) return undefined;
  return undefined;
}

export async function searchTmdbMulti(query: string) {
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER_TOKEN) return null;
  const params: Record<string, string> = { query };
  if (process.env.TMDB_API_KEY) params.api_key = process.env.TMDB_API_KEY;
  const { data } = await axios.get(`${TMDB_BASE}/search/multi`, { params, headers: authHeaders() });
  return data?.results?.[0] ?? null;
}

export function toPoster(path?: string | null) {
  return path ? `${IMAGE_BASE}${path}` : undefined;
}
