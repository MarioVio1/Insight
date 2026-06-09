import { supabase } from '../services/supabase.js';
import { fetchTmdbDetails, searchTmdbPerson, tmdbPersonImage } from '../services/tmdbService.js';

const tmdbCache = new Map<string, { poster: string | null; backdrop: string | null; rating: number | null; age: number }>();
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
      backdrop: d.backdrop,
      rating: d.rating,
      age: Date.now()
    };
    tmdbCache.set(key, data);
    return data;
  } catch {
    tmdbCache.set(key, { poster: null, backdrop: null, rating: null, age: Date.now() });
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

export async function catalogHandler(configId: string, catalogId: string) {
  const { data } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', 'adaptive-insights')
    .maybeSingle();

  if (!data?.metas?.length) {
    return { metas: [{
      id: 'adaptive_setup',
      type: 'movie',
      name: '⚙️ Configura l\'addon',
      poster: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/><text x="300" y="400" fill="#0ea5e9" font-size="28" font-weight="800" text-anchor="middle" font-family="Arial">Configura</text><text x="300" y="440" fill="#64748b" font-size="16" text-anchor="middle" font-family="Arial">Connetti Trakt e fai il sync</text></svg>').toString('base64'),
      background: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/></svg>').toString('base64'),
      description: 'Collega Trakt e sincronizza per vedere le tue statistiche.'
    }]};
  }

  const metas = (data?.metas ?? []).map((m: any) => {
    const { statValue, statLabel, imageUrl, ...clean } = m;
    return { ...clean, type: 'movie' };
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
    type: 'movie'
  };

  const cardType = (metaId.split('_').pop() || '').toLowerCase();
  const videos = meta.videos || [];

  const tmdbLookups = videos
    .filter(v => v.tmdb_id)
    .map(v => getTmdbData(v.tmdb_id, v.trakt_type || 'movie'));
  const tmdbResults = tmdbLookups.length > 0 ? await Promise.all(tmdbLookups) : [];

  let tmdbIdx = 0;
  const enrichedVideos = [];
  for (const v of videos) {
    let thumbnail = v.thumbnail || null;
    let rating: number | null = v.rating || null;
    let overview = v.overview || '';

    if (v.tmdb_id) {
      const tmdbData = tmdbResults[tmdbIdx];
      tmdbIdx++;
      if (tmdbData) {
        if (!thumbnail) thumbnail = tmdbData.backdrop || tmdbData.poster;
        if (rating === null) rating = tmdbData.rating;
      }
    }

    if (!thumbnail) {
      if (cardType === 'actor' || cardType === 'director') {
        thumbnail = await getPersonImage(v.title);
      } else if (v.tmdb_id) {
        const tmdbData = tmdbResults[tmdbIdx - 1];
        if (tmdbData) thumbnail = tmdbData.backdrop || tmdbData.poster;
      }
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

  const hasRealContent = enrichedVideos.some(v => v.tmdb_id);
  if (!hasRealContent && enrichedVideos.length > 0) {
    try {
      const { data: recent } = await supabase
        .from('trakt_events')
        .select('title, watched_at, trakt_type, tmdb_id')
        .eq('config_id', configId)
        .order('watched_at', { ascending: false })
        .limit(10);

      if (recent && recent.length > 0) {
        const recentLookups = recent
          .filter(e => e.tmdb_id)
          .map(e => getTmdbData(e.tmdb_id, e.trakt_type === 'movie' ? 'movie' : 'tv'));
        const recentResults = recentLookups.length > 0 ? await Promise.all(recentLookups) : [];
        let rIdx = 0;
        for (let i = 0; i < recent.length; i++) {
          const evt = recent[i];
          let rt = null;
          if (evt.tmdb_id) {
            rt = recentResults[rIdx];
            rIdx++;
          }
          enrichedVideos.push({
            id: `${metaId}_recent_${i}`,
            title: evt.title,
            released: evt.watched_at,
            overview: 'Contenuto recente dalle tue statistiche',
            thumbnail: rt?.backdrop || rt?.poster || undefined,
            rating: rt?.rating || undefined,
            tmdb_id: evt.tmdb_id
          });
        }
      }
    } catch {}
  }

  meta.videos = enrichedVideos;
  return { meta };
}
