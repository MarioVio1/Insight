import axios from 'axios';

const KITSU_API = 'https://kitsu.io/api/edge';

export async function searchKitsuAnime(query: string) {
  try {
    const { data } = await axios.get(`${KITSU_API}/anime`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      headers: { Accept: 'application/vnd.api+json' }
    });
    return data?.data?.[0] || null;
  } catch {
    return null;
  }
}

export async function isAnimeByKitsu(tmdbId: number | string, type: string): Promise<boolean | null> {
  try {
    const query = type === 'movie' ? `tmdb_id:${tmdbId}` : `tmdb_id:${tmdbId}`;
    const { data } = await axios.get(`${KITSU_API}/anime`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      headers: { Accept: 'application/vnd.api+json' }
    });
    return data?.data?.length > 0;
  } catch {
    return null;
  }
}

export async function isAnimeByTmdbGenre(tmdbId: number | string, type: string, apiKey?: string): Promise<boolean> {
  try {
    const params: Record<string, string> = {};
    if (apiKey) params.api_key = apiKey;
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const { data } = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}`, { params });
    const lang = data?.original_language;
    const genres: number[] = (data?.genres || []).map((g: any) => g.id);
    return lang === 'ja' && genres.includes(16);
  } catch {
    return false;
  }
}
