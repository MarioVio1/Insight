import { supabase } from '../services/supabase.js';
import { fetchTmdbDetails, fetchWatchProviders, searchTmdbPerson, tmdbPersonImage, discoverByGenre, discoverByPerson, genreNameToTmdbId, searchTmdbPersonId } from '../services/tmdbService.js';
import { t } from '../services/locale.js';
import { INSIGHT_CATALOG_ID, LEGACY_INSIGHT_CATALOG_ID, INSIGHT_TYPE, DISCOVER_CATALOG_ID } from './manifest.js';

const tmdbCache = new Map<string, { poster: string | null; backdrop: string | null; rating: number | null; age: number }>();
const TMDB_CACHE_TTL = 86_400_000;
const personCache = new Map<string, { image: string | null; age: number }>();
const PERSON_CACHE_TTL = 86_400_000;
const providerCache = new Map<string, { providers: { provider_name: string; logo: string }[]; age: number }>();
const PROVIDER_CACHE_TTL = 86_400_000;

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

async function getWatchProviders(tmdbId: number | string, type: string) {
  const key = `${type}_${tmdbId}`;
  const cached = providerCache.get(key);
  if (cached && Date.now() - cached.age < PROVIDER_CACHE_TTL) return cached.providers;
  try {
    const providers = await fetchWatchProviders(tmdbId, type);
    providerCache.set(key, { providers, age: Date.now() });
    return providers;
  } catch {
    providerCache.set(key, { providers: [], age: Date.now() });
    return [];
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
  let { data } = await supabase
    .from('adaptive_rows')
    .select('metas')
    .eq('config_id', configId)
    .eq('catalog_id', INSIGHT_CATALOG_ID)
    .maybeSingle();

  if (!data?.metas?.length) {
    const { data: legacy } = await supabase
      .from('adaptive_rows')
      .select('metas')
      .eq('config_id', configId)
      .eq('catalog_id', LEGACY_INSIGHT_CATALOG_ID)
      .maybeSingle();
    if (legacy?.metas?.length) {
      data = legacy;
      await supabase.from('adaptive_rows').upsert({
        config_id: configId,
        catalog_id: INSIGHT_CATALOG_ID,
        metas: legacy.metas,
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_id,catalog_id' });
      await supabase.from('adaptive_rows').delete()
        .eq('config_id', configId)
        .eq('catalog_id', LEGACY_INSIGHT_CATALOG_ID);
    }
  }

  if (!data?.metas?.length) {
    return { metas: [{
      id: 'adaptive_setup',
      type: INSIGHT_TYPE,
      name: t('setupTitle'),
      poster: 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/><text x="300" y="400" fill="#0ea5e9" font-size="28" font-weight="800" text-anchor="middle" font-family="Arial">${t('setupPosterFallback')}</text><text x="300" y="440" fill="#64748b" font-size="16" text-anchor="middle" font-family="Arial">${t('setupPosterSub')}</text></svg>`).toString('base64'),
      background: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect fill="#0f172a" width="600" height="900"/></svg>').toString('base64'),
      description: t('setupDesc')
    }]};
  }

  const metas = (data?.metas ?? []).map((m: any) => {
    const { statValue, statLabel, imageUrl, ...clean } = m;
    const meta: any = { ...clean, type: 'movie' };
    if (meta.poster && !meta.poster.startsWith('http')) {
      meta.poster = `${baseUrl || ''}${meta.poster}`;
    }
    if (meta.background && !meta.background.startsWith('http')) {
      meta.background = `${baseUrl || ''}${meta.background}`;
    }
    return meta;
  });

  return { metas };
}

export async function discoverHandler(configId: string, baseUrl?: string) {
  const { data: insight } = await supabase
    .from('insight_snapshots')
    .select('summary, genre_counts, top_actors, top_directors, top_writers')
    .eq('config_id', configId)
    .maybeSingle();

  if (!insight) return { metas: [] };

  const summary = insight.summary || {};
  const genreCounts: { genre: string; count: number }[] = insight.genre_counts || [];
  const topActors: { name: string; count: number }[] = insight.top_actors || [];
  const topDirectors: { name: string; count: number }[] = insight.top_directors || [];

  // Get already watched TMDB IDs to filter out
  const { data: watched } = await supabase
    .from('trakt_events')
    .select('tmdb_id')
    .eq('config_id', configId)
    .not('tmdb_id', 'is', null);

  const watchedSet = new Set<number>((watched || []).map((w: any) => w.tmdb_id));

  // Build recommendations from TMDB
  const results: any[] = [];

  // 1. Try top genres
  const topGenres = genreCounts.sort((a, b) => b.count - a.count).slice(0, 3);
  const genreIds = topGenres.map(g => genreNameToTmdbId(g.genre)).filter(Boolean) as number[];

  if (genreIds.length > 0) {
    const byGenre = await discoverByGenre(genreIds, 1, 'movie');
    for (const r of byGenre) {
      if (!watchedSet.has(r.id)) results.push(r);
    }
  }

  // 2. Try top actor's movies
  if (topActors.length > 0 && results.length < 30) {
    for (const actor of topActors.slice(0, 3)) {
      const personId = await searchTmdbPersonId(actor.name);
      if (!personId) continue;
      const byPerson = await discoverByPerson(personId);
      for (const r of byPerson) {
        if (!watchedSet.has(r.id)) results.push(r);
      }
      if (results.length >= 50) break;
    }
  }

  // Deduplicate by ID
  const seen = new Set<number>();
  const deduped = results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 50);

  const metas = deduped.map((r: any) => ({
    id: `discover_${r.media_type}_${r.id}`,
    type: 'movie',
    name: `${r.title} (${r.year || ''})`.trim(),
    poster: r.poster || undefined,
    background: r.backdrop || undefined,
    description: r.overview?.substring(0, 300) || '',
    genres: [],
    releaseInfo: r.year || '',
    imdbRating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : undefined
  }));

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

  const anyVideos = videos as any[];
  const tmdbLookups = anyVideos
    .filter(v => v.tmdb_id)
    .map(v => getTmdbData(v.tmdb_id, (v.trakt_type === 'show' ? 'tv' : v.trakt_type) || 'movie'));
  const providerLookups = anyVideos
    .filter(v => v.tmdb_id && !(v.trakt_type === 'show' || v.trakt_type === 'episode'))
    .map(v => getWatchProviders(v.tmdb_id, (v.trakt_type === 'show' ? 'tv' : v.trakt_type) || 'movie'));
  const [tmdbResults, providerResults] = await Promise.all([
    tmdbLookups.length > 0 ? Promise.all(tmdbLookups) : [],
    providerLookups.length > 0 ? Promise.all(providerLookups) : []
  ]);

  let tmdbIdx = 0;
  let provIdx = 0;
  const enrichedVideos = [];
  for (const v of videos) {
    let thumbnail = v.thumbnail || null;
    let poster: string | null = null;
    let rating: number | null = v.rating || null;
    let overview = v.overview || '';
    let traktType = v.trakt_type || '';
    const hasTmdb = !!v.tmdb_id;
    const isPersonCard = cardType.includes('actors') || cardType.includes('directors') || cardType.includes('writers') || cardType === 'actor' || cardType === 'director' || cardType === 'writer';

    let providers: { provider_name: string; logo: string }[] = [];

    if (v.tmdb_id) {
      const tmdbData = tmdbResults[tmdbIdx];
      tmdbIdx++;
      if (tmdbData && (tmdbData.poster || tmdbData.backdrop) && !isPersonCard) {
        poster = tmdbData.poster || tmdbData.backdrop;
        if (!thumbnail) thumbnail = poster;
        if (rating === null) rating = tmdbData.rating;
      }
      // Fetch providers for movies only
      if (traktType !== 'show' && traktType !== 'episode') {
        providers = providerResults[provIdx] || [];
        provIdx++;
      }
    }

    if (!thumbnail) {
      if (isPersonCard) {
        thumbnail = await getPersonImage(v.title);
        poster = thumbnail;
      }
    }

    enrichedVideos.push({
      id: v.id,
      title: v.title,
      released: v.released,
      overview: overview || t('noDesc'),
      thumbnail: thumbnail || undefined,
      poster: poster || undefined,
      rating: rating || undefined,
      ...(hasTmdb ? { tmdb_id: v.tmdb_id } : {}),
      ...(providers.length > 0 ? { streamProviders: providers } : {})
    });
  }

  if (enrichedVideos.length === 0) {
    try {
      const { data: recent } = await supabase
        .from('trakt_events')
        .select('title, watched_at, trakt_type, tmdb_id')
        .eq('config_id', configId)
        .order('watched_at', { ascending: false })
        .limit(3);

      if (recent && recent.length > 0) {
        for (const evt of recent) {
          if (!evt.tmdb_id) continue;
          enrichedVideos.push({
            id: `${metaId}_recent_${enrichedVideos.length}`,
            title: evt.title,
            released: evt.watched_at,
            overview: '',
            tmdb_id: evt.tmdb_id
          });
        }
      }
    } catch {}
  }

  meta.videos = enrichedVideos;
  return { meta };
}
