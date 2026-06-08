import { supabase } from '../services/supabase.js';
import { fetchTmdbDetails, searchTmdbPerson, tmdbPersonImage } from '../services/tmdbService.js';
import { INSIGHT_CATALOG_ID, INSIGHT_TYPE, LEGACY_INSIGHT_CATALOG_ID } from './manifest.js';

const tmdbCache = new Map<string, { poster: string | null; rating: number | null; age: number }>();
const TMDB_CACHE_TTL = 86_400_000;
const personCache = new Map<string, { image: string | null; age: number }>();
const PERSON_CACHE_TTL = 86_400_000;

async function getTmdbData(tmdbId: number | string, type: string) {
  const key = `${type}_${tmdbId}`;
  const cached = tmdbCache.get(key);
  if (cached && Date.now() - cached.age < TMDB_CACHE_TTL) return cached;
  try {
    const d = await fetchTmdbDetails(tmdbId, type);
    const data = {
      poster: d.poster,
      rating: d.rating,
      age: Date.now()
    };
    tmdbCache.set(key, data);
    return data;
  } catch {
    tmdbCache.set(key, { poster: null, rating: null, age: Date.now() });
    return null;
  }
}

async function getPersonImage(name: string): Promise<string | null> {
  const cached = personCache.get(name);
  if (cached && Date.now() - cached.age < PERSON_CACHE_TTL) return cached.image;
  try {
    const person = await searchTmdbPerson(name);
    const image = person ? tmdbPersonImage(person.profile_path) : null;
    personCache.set(name, { image, age: Date.now() });
    return image;
  } catch {
    personCache.set(name, { image: null, age: Date.now() });
    return null;
  }
}

export async function catalogHandler(configId: string, catalogId: string, baseUrl?: string) {
  const requestedCatalogId = catalogId === INSIGHT_CATALOG_ID ? INSIGHT_CATALOG_ID : LEGACY_INSIGHT_CATALOG_ID;
  let { data } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', requestedCatalogId)
    .maybeSingle();

  if (!data?.metas?.length && requestedCatalogId !== LEGACY_INSIGHT_CATALOG_ID) {
    const fallback = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', configId)
      .eq('catalog_id', LEGACY_INSIGHT_CATALOG_ID)
      .maybeSingle();
    data = fallback.data;
  }

  if (!data?.metas?.length) {
    return { metas: [{
      id: 'adaptive_setup',
      type: INSIGHT_TYPE,
      name: '⚙️ Configura l\'addon',
      poster: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/><text x="300" y="400" fill="#fff" font-size="48" text-anchor="middle">Setup</text></svg>').toString('base64'),
      background: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/></svg>').toString('base64'),
      description: 'Collega Trakt e sincronizza per vedere le tue statistiche.'
    }]};
  }

  const metas = (data?.metas ?? []).map((m: any) => {
    const descWithStats = `${m.statLabel ? `[${m.statLabel}: ${m.statValue}]\n` : ''}${m.description}`;
    let poster = m.poster || '';
    if (poster.startsWith('/') && baseUrl) poster = `${baseUrl}${poster}`;
    if (!poster && m.imageUrl) poster = m.imageUrl;
    return { 
      id: m.id,
      type: INSIGHT_TYPE,
      name: m.name,
      poster,
      description: descWithStats,
      posterShape: m.posterShape,
      genres: m.genres
    };
  });

  return { metas };
}

export async function metaHandler(configId: string, metaId: string) {
  const { data } = await supabase
    .from('adaptive_meta')
    .select('meta')
    .eq('config_id', configId)
    .eq('meta_id', metaId)
    .maybeSingle();

  if (!data?.meta) return { meta: null };

  const meta = {
    ...data.meta,
    type: INSIGHT_TYPE
  };

  const cardType = (metaId.split('_').pop() || '').toLowerCase();
  const videos = meta.videos || [];

  const enrichedVideos = [];
  for (const v of videos) {
    let thumbnail = v.thumbnail || null;
    let rating: number | null = v.rating || null;
    let overview = v.overview || '';

    if (v.tmdb_id) {
      const tmdbData = await getTmdbData(v.tmdb_id, v.trakt_type || 'movie');
      if (tmdbData) {
        if (!thumbnail) thumbnail = tmdbData.poster;
        if (rating === null) rating = tmdbData.rating;
        if (!overview) overview = overview || '';
      }
    }

    if (!thumbnail && (cardType === 'actor' || cardType === 'director')) {
      thumbnail = await getPersonImage(v.title);
    }

    enrichedVideos.push({
      id: v.id,
      title: v.title,
      released: v.released,
      overview: overview || 'Nessuna descrizione',
      thumbnail: thumbnail || undefined,
      rating: rating || undefined,
      ...(v.tmdb_id ? { tmdb_id: v.tmdb_id } : {})
    });
  }

  meta.videos = enrichedVideos;
  return { meta };
}
