import { supabase } from './supabase.js';
import { fetchTmdbDetails, searchTmdbPerson, tmdbPersonImage } from './tmdbService.js';
import { INSIGHT_CATALOG_ID } from '../addon/manifest.js';

async function getEvents(configId: string, daysBack?: number): Promise<any[]> {
  let q = supabase.from('trakt_events').select('*').eq('config_id', configId);
  if (daysBack) {
    const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
    q = q.gte('watched_at', cutoff);
  }
  const { data } = await q.order('watched_at', { ascending: false }).limit(daysBack ? 500 : 2000);
  return data || [];
}

function eventToVideo(event: any, index: number, prefix: string) {
  const episodeTitle = event.payload?.episode?.title;
  return {
    id: `${prefix}_c_${index}`,
    title: episodeTitle || event.title,
    released: event.watched_at,
    overview: episodeTitle
      ? `${event.title} · Stagione ${event.payload.episode.season} Episodio ${event.payload.episode.number}`
      : `${event.trakt_type === 'movie' ? 'Film' : event.year ? `Episodio (${event.year})` : 'Episodio'}`,
    tmdb_id: event.tmdb_id,
    trakt_type: event.trakt_type
  };
}

function dedupeEvents(events: any[]): any[] {
  const seen = new Set<number>();
  return events.filter(e => {
    if (!e.tmdb_id) return true;
    if (seen.has(e.tmdb_id)) return false;
    seen.add(e.tmdb_id);
    return true;
  });
}

async function cardMeta(
  configId: string,
  id: string,
  name: string,
  description: string,
  opts?: { accent?: string; statValue?: string; statLabel?: string; imageUrl?: string; rating?: number }
) {
  const accent = opts?.accent || '#0ea5e9';

  const meta: any = {
    id,
    type: 'movie',
    name,
    poster: opts?.imageUrl || `/poster/${configId}/${id}.png`,
    posterShape: 'poster',
    genres: ['Insights'],
    description,
    statValue: opts?.statValue || null,
    statLabel: opts?.statLabel || null,
    imageUrl: opts?.imageUrl || null
  };

  if (opts?.rating != null) meta.rating = opts.rating;

  return meta;
}

function video(id: string, title: string, released: string, overview: string) {
  return { id, title, released, overview };
}

const TMDB_IMG = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

export async function rebuildAdaptiveRow(configId: string, baseUrl = '') {
  if (!baseUrl) baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const cfgRes = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  if (cfgRes.error && String(cfgRes.error).includes('does not exist')) {
    throw new Error('Tabella "addon_configs" non esiste.');
  }

  const insightRes = await supabase.from('insight_snapshots').select('*').eq('config_id', configId).maybeSingle();
  if (insightRes.error && String(insightRes.error).includes('does not exist')) {
    throw new Error('Tabella "insight_snapshots" non esiste. Esegui supabase/init.sql.');
  }

  const prefsRes = await supabase.from('config_preferences').select('*').eq('config_id', configId).maybeSingle();

  const cfg = cfgRes.data;
  const insight = insightRes.data;
  let prefs = prefsRes.data;

  if (!cfg) { console.error('Config not found for', configId); return; }
  if (!insight) { console.error('Insight not found for', configId, '- run sync first'); return; }

  if (!prefs) {
    const { data: newPrefs } = await supabase.from('config_preferences').insert({
      config_id: configId,
      enabled_card_types: ['totals','streak','peak','weekly','genre','binge','dropped','monthly','recurring','rewatch','seasonal','actor','director','writer','movieActors','seriesActors','animeActors','movieDirectors','seriesDirectors','animeDirectors','movieWriters','seriesWriters','animeWriters','top5genres','anime','ranking','memories','firstplay','giorni','migliore','anno','mese','split','notturno','events','pace','weekend','annuale','primetime','decade','break','avg','night','series','vintage','completion','tipologia','confronto','decenni','revisioni'],
      focus_mode: 'adaptive',
      seasonal_enabled: true,
      festive_enabled: true,
      style_mode: 'cinematic'
    }).select('*').maybeSingle();
    prefs = newPrefs;
  }

  const s = insight.summary || {};
  const saved = prefs?.enabled_card_types || [];
  const allEnabled = ['totals','streak','peak','weekly','genre','binge','dropped','monthly','recurring','rewatch','seasonal','actor','director','writer','movieActors','seriesActors','animeActors','movieDirectors','seriesDirectors','animeDirectors','movieWriters','seriesWriters','animeWriters','top5genres','anime','ranking','memories','firstplay','giorni','migliore','anno','mese','split','notturno','events','pace','weekend','annuale','primetime','decade','break','avg','night','series','vintage','completion'];

  // Build title→TMDB map from all events for cross-referencing
  const allEvents = await getEvents(configId);
  const titleTmdbMap = new Map<string, { tmdb_id: number; trakt_type: string; year: number }>();
  for (const e of allEvents) {
    const key = e.title?.toLowerCase();
    if (key && e.tmdb_id && !titleTmdbMap.has(key)) {
      titleTmdbMap.set(key, { tmdb_id: e.tmdb_id, trakt_type: e.trakt_type, year: e.year });
    }
  }
  const enabled = saved.length > 0 ? saved : allEnabled;
  const cards: any[] = [];
  const details: { meta_id: string; meta: any }[] = [];

  // Totali
  if (enabled.includes('totals')) {
    const id = `adaptive_${configId}_totals`;
    const totalHours = s.totalHours || 0;
    const uc = s.uniqueTitles || 0;
    const totalM = s.totalMovies || 0;
    const seriesE = s.seriesEpisodes || 0;
    const animeC = s.animeCount || 0;
    const mh = s.movieHours || 0;
    const eh = s.episodeHours || 0;

    cards.push(await cardMeta(configId, id,
      `${Math.floor(totalHours)} ore di visione`,
      `${totalM} film · ${seriesE} episodi · ${animeC} anime · ${uc} titoli`,
      { accent: '#22c55e', statValue: `${Math.floor(totalHours)}h`, statLabel: 'TOTALI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Il tuo viaggio totale',
        description: `${totalM} film · ${seriesE} episodi · ${animeC} anime · ${Math.floor(totalHours)} ore`,
        videos: [
          video(`${id}_1`, `${totalM} film visti (${Math.floor(mh)} ore)`, new Date().toISOString(), 'Totale film.'),
          video(`${id}_2`, `${seriesE} episodi (${Math.floor(eh)} ore)`, new Date().toISOString(), 'Totale episodi.'),
          video(`${id}_3`, `${animeC} anime guardati`, new Date().toISOString(), 'Contenuti anime.'),
          video(`${id}_4`, `${Math.floor(totalHours)} ore guardate`, new Date().toISOString(), 'Tempo totale.'),
          video(`${id}_5`, `${uc} titoli unici`, new Date().toISOString(), 'Contenuti distinti.')
        ]
      }
    });
  }

  // Streak
  if (enabled.includes('streak') && s.streak !== undefined) {
    const id = `adaptive_${configId}_streak`;
    const streak = s.streak;
    cards.push(await cardMeta(configId, id,
      streak === 1 ? 'Ieri hai guardato qualcosa' : `${streak} giorni di streak!`,
      streak > 0 ? `Sono ${streak} giorni consecutivi che guardi almeno un contenuto.` : 'Nessuna streak attiva.',
      { accent: '#f97316', statValue: `${streak}`, statLabel: 'GIORNI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'La tua streak',
        description: 'Giorni consecutivi di visione.',
        videos: [video(`${id}_1`, `${streak} giorni`, new Date().toISOString(), streak > 0 ? `Stai guardando qualcosa da ${streak} giorni di fila!` : 'Nessuna streak.')]
      }
    });
  }

  // Peak hour
  if (enabled.includes('peak') && s.peakHour) {
    const id = `adaptive_${configId}_peak`;
    const ph = s.peakHour;
    const hourStr = `${String(ph.hour).padStart(2, '0')}:00`;
    cards.push(await cardMeta(configId, id,
      `Il tuo orario di punta: ${hourStr}`,
      `Alle ${hourStr} hai registrato ${ph.count} visioni, più di ogni altra ora.`,
      { accent: '#a855f7', statValue: hourStr, statLabel: 'ORA PREFERITA' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Il tuo orario preferito',
        description: 'Quando guardi di più?',
        videos: [video(`${id}_1`, `${hourStr}`, new Date().toISOString(), `${ph.count} visioni in questa fascia oraria.`)]
      }
    });
  }

  // Top day
  if (enabled.includes('weekly') && s.topDay) {
    const id = `adaptive_${configId}_day`;
    const td = s.topDay;
    cards.push(await cardMeta(configId, id,
      `Il tuo giorno: ${td.name}`,
      `Di ${td.name} hai totalizzato ${td.count} visioni, il giorno più attivo della settimana.`,
      { accent: '#38bdf8', statValue: td.name, statLabel: 'GIORNO TOP' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Giorni della settimana',
        description: 'Distribuzione delle tue visioni per giorno.',
        videos: [video(`${id}_1`, `${td.name}`, new Date().toISOString(), `${td.count} visioni in questo giorno.`)]
      }
    });
  }

  // Genre
  if (enabled.includes('genre') && s.topGenre) {
    const id = `adaptive_${configId}_genre`;
    const tg = s.topGenre;
    const genreCounts = s.genre_counts || [];
    const totalG = genreCounts.reduce((a: number, g: any) => a + g.count, 0);

    cards.push(await cardMeta(configId, id,
      `Il tuo genere: ${tg}`,
      `${tg} domina con ${genreCounts.find((g: any) => g.name === tg)?.count || 0} visioni.`,
      { accent: '#a855f7', statValue: tg, statLabel: 'GENERE TOP' }
    ));

    const genreEvents = tg && tg.length > 0 ? dedupeEvents((await getEvents(configId)).filter((e: any) => (e.genres || []).includes(tg))).slice(0, 100) : [];
    const genreVids = genreEvents.length > 0
      ? genreEvents.map((evt: any, i: number) => eventToVideo(evt, i, id))
      : genreCounts.slice(0, 10).map((g: any, i: number) =>
          video(`${id}_${i}`, g.name, new Date().toISOString(), `${g.count} visioni (${totalG > 0 ? Math.round(g.count / totalG * 100) : 0}% del totale).`)
        );

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: `I tuoi ${tg ? `${tg}: ` : ''}contenuti`,
        description: 'Quali generi guardi di più.',
        videos: genreVids
      }
    });
  }

  // Binge
  if (enabled.includes('binge') && s.binges && s.binges.length > 0) {
    const id = `adaptive_${configId}_binge`;
    const topBinge = s.binges[0];

    let rating: number | null = null;
    if (topBinge.tmdb_id) {
      try { const d = await fetchTmdbDetails(topBinge.tmdb_id, 'tv'); rating = d.rating; } catch {}
    }

    cards.push(await cardMeta(configId, id,
      `Binge: ${topBinge.episodes} episodi di ${topBinge.title}`,
      `Hai guardato ${topBinge.episodes} episodi di fila di ${topBinge.title} in un giorno.`,
      { accent: '#ef4444', statValue: `${topBinge.episodes}`, statLabel: 'BINGE MAX', rating: rating || undefined }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Le tue maratone',
        description: 'I giorni in cui hai guardato più episodi della stessa serie.',
        videos: s.binges.slice(0, 100).map((b: any, i: number) => ({
          id: `${id}_${i}`,
          title: `${b.title} (${b.episodes}ep)`,
          released: b.date,
          overview: `${b.episodes} episodi in un giorno.`,
          tmdb_id: b.tmdb_id || null,
          trakt_type: 'show'
        }))
      }
    });
  }

  // Dropped
  if (enabled.includes('dropped') && s.dropped && s.dropped.length > 0) {
    const id = `adaptive_${configId}_dropped`;

    let rating: number | null = null;
    if (s.dropped[0].tmdb_id) {
      try { const d = await fetchTmdbDetails(s.dropped[0].tmdb_id, 'tv'); rating = d.rating; } catch {}
    }

    cards.push(await cardMeta(configId, id,
      `${s.dropped.length} serie in pausa`,
      `Serie che non guardi da mesi. Forse è ora di riprenderle?`,
      { accent: '#6b7280', statValue: `${s.dropped.length}`, statLabel: 'IN PAUSA', rating: rating || undefined }
    ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Serie in pausa',
          description: 'Serie che non guardi da più di 3 mesi.',
          videos: s.dropped.slice(0, 100).map((d: any, i: number) => ({
            id: `${id}_${i}`,
            title: `${d.title} (${d.totalEpisodes}ep)`,
            released: d.lastDate,
            overview: `${d.totalEpisodes} episodi visti, ultima volta ${new Date(d.lastDate).toLocaleDateString('it-IT')}.`,
            tmdb_id: d.tmdb_id || null,
            trakt_type: 'show'
          }))
        }
      });
  }

  // Monthly comparison
  if (enabled.includes('monthly') && s.monthCount !== undefined && s.lastMonthCount !== undefined) {
    const id = `adaptive_${configId}_monthly`;
    const curr = s.monthCount;
    const prev = s.lastMonthCount || 0;
    const diff = curr - prev;
    const diffText = diff >= 0 ? `+${diff} rispetto al mese scorso` : `${diff} rispetto al mese scorso`;

    cards.push(await cardMeta(configId, id,
      `${curr} contenuti questo mese`,
      diffText,
      { accent: '#14b8a6', statValue: `${curr}`, statLabel: 'QUESTO MESE' }
    ));

    const recentEvents = dedupeEvents(await getEvents(configId, 30));
    const monthlyVids = recentEvents.slice(0, 100).map((evt, i) => eventToVideo(evt, i, id));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: `Contenuti degli ultimi 30 giorni (${curr})`,
        description: 'Cosa hai guardato questo mese.',
        videos: monthlyVids.length > 0 ? monthlyVids : [
          video(`${id}_1`, `${curr} questo mese`, new Date().toISOString(), `Contenuti guardati negli ultimi 30 giorni.`),
          video(`${id}_2`, `${prev} mese scorso`, new Date().toISOString(), `Contenuti guardati nei 30 giorni precedenti.`)
        ]
      }
    });
  }

  // Recurring
  if (enabled.includes('recurring')) {
    const recurringTitles = insight.recurring_titles || [];
    if (recurringTitles.length > 0) {
      const id = `adaptive_${configId}_recurring`;

      cards.push(await cardMeta(configId, id,
        `${recurringTitles.length} titoli ricorrenti`,
        `Titoli che torni a guardare ogni anno nello stesso periodo.`,
        { accent: '#f59e0b', statValue: `${recurringTitles.length}`, statLabel: 'RICORRENTI' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Le tue ricorrenze',
          description: 'Titoli che guardi sempre nello stesso mese.',
          videos: recurringTitles.slice(0, 100).map((r: any, i: number) => {
            const evt = titleTmdbMap.get(r.title.toLowerCase());
            const v: any = video(`${id}_${i}`, r.title, new Date().toISOString(), `Visto ${r.count} volte nei mesi: ${r.months.join(', ')}.`);
            if (evt?.tmdb_id) { v.tmdb_id = evt.tmdb_id; v.trakt_type = evt.trakt_type; }
            return v;
          })
        }
      });
    }
  }

  // Rewatch (solo serie TV, gli anime sono nella card anime)
  if (enabled.includes('rewatch')) {
      const rewatchTitles = s.seriesRewatch || [];
    if (rewatchTitles.length > 0) {
      const id = `adaptive_${configId}_rewatch`;
      const topRewatch = rewatchTitles[0];

      let rating: number | null = null;
      if (topRewatch.tmdb_id) {
        try {
          const mediaType = topRewatch.type === 'movie' ? 'movie' : 'tv';
          const d = await fetchTmdbDetails(topRewatch.tmdb_id, mediaType);
          rating = d.rating;
        } catch {}
      }

      cards.push(await cardMeta(configId, id,
        `Rivisto: ${topRewatch.title} (${topRewatch.count}x)`,
        `Titoli che hai guardato più di una volta.`,
        { accent: '#ef4444', statValue: `${topRewatch.count}x`, statLabel: 'REWATCH', rating: rating || undefined }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'I tuoi comfort rewatch',
          description: 'Quelli che non guardi una volta sola.',
          videos: rewatchTitles.slice(0, 100).map((r: any, i: number) => ({
            id: `${id}_${i}`,
            title: `${r.title} (${r.count}x)`,
            released: new Date().toISOString(),
            overview: `Rivisto ${r.count} volte.`,
            tmdb_id: r.tmdb_id || null,
            trakt_type: r.type || 'show'
          }))
        }
      });
    }
  }

  // Seasonal
  if (enabled.includes('seasonal')) {
    const id = `adaptive_${configId}_seasonal`;
    const seasonalKey = insight.seasonal_key || 'standard';
    const seasonalTitles: { title: string; count: number }[] = s.seasonalTitles || [];
    const seasonTexts: Record<string, string> = {
      christmas: "L'anno scorso in questo periodo avevi già iniziato il mood natalizio.",
      halloween: 'C\'è odore di horror di stagione nel tuo profilo.',
      summer: 'L\'estate tende a riaccendere maratone e rewatch più leggeri.',
      standard: 'Questa card cambia con il calendario e con il tuo profilo.'
    };
    const seasonAccents: Record<string, string> = {
      christmas: '#dc2626', halloween: '#f97316', summer: '#f59e0b', standard: '#0ea5e9'
    };

    const desc = seasonalTitles.length > 0
      ? `Più visti: ${seasonalTitles.slice(0, 20).map((t: any) => t.title).join(', ')}`
      : (seasonTexts[seasonalKey] || seasonTexts.standard);

    cards.push(await cardMeta(configId, id,
      `Stagione: ${seasonalKey}`,
      desc,
      { accent: seasonAccents[seasonalKey] || seasonAccents.standard, statValue: seasonalKey.toUpperCase(), statLabel: 'STAGIONE' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'La stagione del tuo profilo',
        description: desc,
        videos: seasonalTitles.length > 0
          ? seasonalTitles.slice(0, 100).map((t: any, i: number) => {
              const evt = titleTmdbMap.get(t.title.toLowerCase());
              const v: any = video(`${id}_${i}`, t.title, new Date().toISOString(), `Visto ${t.count} volte in questa stagione.`);
              if (evt?.tmdb_id) { v.tmdb_id = evt.tmdb_id; v.trakt_type = evt.trakt_type; }
              return v;
            })
          : [video(`${id}_1`, seasonalKey, new Date().toISOString(), seasonTexts[seasonalKey] || seasonTexts.standard)]
      }
    });
  }

  // Attore preferito
  if (enabled.includes('actor')) {
    const actors = insight.top_actors || [];
    if (actors.length > 0) {
      const id = `adaptive_${configId}_actor`;
      const top = actors[0];

      cards.push(await cardMeta(configId, id,
        `Attore: ${top.name}`,
        `Appare in ${top.count} dei tuoi contenuti guardati.`,
        { accent: '#ec4899', statValue: top.name, statLabel: 'ATTORE TOP' }
      ));

      const actorVids = await Promise.all(actors.slice(0, 100).map(async (a: any, i: number) => {
        const v: any = video(`${id}_${i}`, a.name, new Date().toISOString(), `Appare in ${a.count} contenuti.`);
        try {
          const p = await searchTmdbPerson(a.name);
          if (p?.profile_path) {
            v.thumbnail = tmdbPersonImage(p.profile_path);
            v.tmdb_id = p.id;
          }
        } catch {}
        return v;
      }));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Attori preferiti',
          description: 'Gli attori che vedi più spesso.',
          videos: actorVids
        }
      });
    }
  }

  // Regista preferito
  if (enabled.includes('director')) {
    const directors = insight.top_directors || [];
    if (directors.length > 0) {
      const id = `adaptive_${configId}_director`;
      const top = directors[0];

      cards.push(await cardMeta(configId, id,
        `Regista: ${top.name}`,
        `Compare in ${top.count} dei tuoi contenuti.`,
        { accent: '#8b5cf6', statValue: top.name, statLabel: 'REGISTA TOP' }
      ));

      const directorVids = await Promise.all(directors.slice(0, 100).map(async (d: any, i: number) => {
        const v: any = video(`${id}_${i}`, d.name, new Date().toISOString(), `Compare in ${d.count} contenuti.`);
        try {
          const p = await searchTmdbPerson(d.name);
          if (p?.profile_path) {
            v.thumbnail = tmdbPersonImage(p.profile_path);
            v.tmdb_id = p.id;
          }
        } catch {}
        return v;
      }));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Registi preferiti',
          description: 'I registi che guardi di più.',
          videos: directorVids
        }
      });
    }
  }

  // Sceneggiatore preferito
  if (enabled.includes('writer')) {
    const writers = insight.top_writers || [];
    if (writers.length > 0) {
      const id = `adaptive_${configId}_writer`;
      const top = writers[0];

      cards.push(await cardMeta(configId, id,
        `Sceneggiatore: ${top.name}`,
        `Compare in ${top.count} dei tuoi contenuti.`,
        { accent: '#f59e0b', statValue: top.name, statLabel: 'SCENEGGIATORE' }
      ));

      const writerVids = await Promise.all(writers.slice(0, 100).map(async (w: any, i: number) => {
        const v: any = video(`${id}_${i}`, w.name, new Date().toISOString(), `Compare in ${w.count} contenuti.`);
        try {
          const p = await searchTmdbPerson(w.name);
          if (p?.profile_path) {
            v.thumbnail = tmdbPersonImage(p.profile_path);
            v.tmdb_id = p.id;
          }
        } catch {}
        return v;
      }));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Sceneggiatori preferiti',
          description: 'Gli sceneggiatori che guardi di più.',
          videos: writerVids
        }
      });
    }
  }

  // Card suddivise per ruolo + categoria (film/serie/anime)
  async function addRoleSplitCards(
    cardType: string,
    list: any[],
    metaName: string,
    metaDesc: string,
    statLabel: string,
    accent: string,
    roleName: string
  ) {
    if (!enabled.includes(cardType) || !list?.length) return;
    const id = `adaptive_${configId}_${cardType}`;
    const top = list[0];
    cards.push(await cardMeta(configId, id,
      `${roleName}: ${top.name}`,
      `Compare in ${top.count} contenuti ${metaName.toLowerCase()}.`,
      { accent, statValue: top.name, statLabel }
    ));
    const vids = await Promise.all(list.slice(0, 100).map(async (item: any, i: number) => {
      const v: any = video(`${id}_${i}`, item.name, new Date().toISOString(), `Compare in ${item.count} contenuti.`);
      try {
        const p = await searchTmdbPerson(item.name);
        if (p?.profile_path) {
          v.thumbnail = tmdbPersonImage(p.profile_path);
          v.tmdb_id = p.id;
        }
      } catch {}
      return v;
    }));
    details.push({
      meta_id: id, meta: { id, type: 'movie', name: metaName, description: metaDesc, videos: vids }
    });
  }

  await addRoleSplitCards('movieActors', s.topMovieActors, 'Attori Film', 'Attori che guardi nei film.', 'ATTORE FILM', '#ec4899', 'Attore film');
  await addRoleSplitCards('seriesActors', s.topSeriesActors, 'Attori Serie', 'Attori che guardi nelle serie.', 'ATTORE SERIE', '#f43f5e', 'Attore serie');
  await addRoleSplitCards('animeActors', s.topAnimeActors, 'Attori Anime', 'Attori che guardi negli anime.', 'ATTORE ANIME', '#d946ef', 'Attore anime');
  await addRoleSplitCards('movieDirectors', s.topMovieDirectors, 'Registi Film', 'Registi che guardi nei film.', 'REGISTA FILM', '#8b5cf6', 'Regista film');
  await addRoleSplitCards('seriesDirectors', s.topSeriesDirectors, 'Registi Serie', 'Registi che guardi nelle serie.', 'REGISTA SERIE', '#a855f7', 'Regista serie');
  await addRoleSplitCards('animeDirectors', s.topAnimeDirectors, 'Registi Anime', 'Registi che guardi negli anime.', 'REGISTA ANIME', '#6366f1', 'Regista anime');
  await addRoleSplitCards('movieWriters', s.topMovieWriters, 'Sceneggiatori Film', 'Sceneggiatori che guardi nei film.', 'SCENEGG. FILM', '#f59e0b', 'Sceneggiatore film');
  await addRoleSplitCards('seriesWriters', s.topSeriesWriters, 'Sceneggiatori Serie', 'Sceneggiatori che guardi nelle serie.', 'SCENEGG. SERIE', '#fb923c', 'Sceneggiatore serie');
  await addRoleSplitCards('animeWriters', s.topAnimeWriters, 'Sceneggiatori Anime', 'Sceneggiatori che guardi negli anime.', 'SCENEGG. ANIME', '#f97316', 'Sceneggiatore anime');

  // Top 5 generi
  if (enabled.includes('top5genres')) {
    const genres = s.genre_counts || [];
    if (genres.length > 0) {
      const top5 = genres.slice(0, 5);
      const id = `adaptive_${configId}_top5genres`;
      const line = top5.map((g: any) => `${g.genre} (${g.count})`).join(' · ');
      cards.push(await cardMeta(configId, id,
        `Generi: ${top5[0].genre}`,
        `Top 5 generi: ${line}`,
        { accent: '#a855f7', statValue: top5[0].genre, statLabel: 'GENERE TOP' }
      ));
      const genreVids = await Promise.all(top5.map(async (g: any, i: number) => {
        const v: any = video(`${id}_${i}`, g.genre, new Date().toISOString(), `${g.count} contenuti in questo genere.`);
        v.trakt_type = 'movie';
        return v;
      }));
      details.push({
        meta_id: id, meta: { id, type: 'movie', name: 'Top 5 generi', description: 'I tuoi 5 generi più guardati.', videos: genreVids }
      });
    }
  }

  // Anime
  if (enabled.includes('anime') && s.animeCount !== undefined && s.animeCount > 0) {
    const id = `adaptive_${configId}_anime`;
    const ah = s.animeHours || 0;
    const am = s.animeMovies || 0;
    const ae = s.animeEpisodes || 0;
    const ab = s.animeBinges || [];
    const ad = s.animeDropped || [];
    const ar = s.animeRewatch || [];
    const aPct = s.animePct ?? 0;
    const aStreak = s.animeStreak ?? 0;
    const aPeak = s.animePeakHour as { hour: number; count: number } | null ?? null;
    const aAvgPerDay = s.animeAvgPerDay ?? 0;
    cards.push(await cardMeta(configId, id,
      `${s.animeCount} anime guardati (${aPct}%)`,
      `${am} film · ${ae} episodi · ${Math.floor(ah)} ore · ${aPct}% del totale`,
      { accent: '#f43f5e', statValue: `${s.animeCount}`, statLabel: 'ANIME' }
    ));

    const av: any[] = [
      video(`${id}_1`, `${am} film anime visti`, new Date().toISOString(), `Film anime. ${aPct}% dei tuoi contenuti totali.`),
      video(`${id}_2`, `${ae} episodi anime visti (${s.animeUniqueTitles || 0} titoli unici)`, new Date().toISOString(), 'Episodi anime.'),
      video(`${id}_3`, `${Math.floor(ah)} ore di anime`, new Date().toISOString(), 'Tempo totale speso con gli anime.')
    ];
    if (aStreak > 0) av.push(video(`${id}_streak`, `Streak anime: ${aStreak} giorni consecutivi`, new Date().toISOString(), `L'ultima volta hai guardato anime per ${aStreak} giorni di fila.`));
    if (aPeak) av.push(video(`${id}_peak`, `Orario anime preferito: ${String(aPeak.hour).padStart(2, '0')}:00 (${aPeak.count} visioni)`, new Date().toISOString(), 'La fascia oraria in cui guardi più anime.'));
    if (aAvgPerDay > 0) av.push(video(`${id}_avg`, `Media: ${aAvgPerDay} anime al giorno`, new Date().toISOString(), `In media ${aAvgPerDay} anime nei giorni in cui guardi anime.`));
    if (ab.length > 0) av.push(video(`${id}_4`, `Binge max: ${ab[0].title} (${ab[0].episodes}ep)`, new Date().toISOString(), 'Maggior numero di episodi anime guardati in un giorno.'));
    if (ad.length > 0) av.push(video(`${id}_5`, `${ad.length} anime in pausa da oltre 3 mesi`, new Date().toISOString(), 'Anime che non guardi da molto tempo.'));
    if (ar.length > 0) av.push(video(`${id}_6`, `Rivisto: ${ar[0].title} (${ar[0].count}x)`, new Date().toISOString(), 'Anime che hai guardato più di una volta.'));

    const animeTmdbSet = new Set((s.animeTmdbIds || []) as number[]);
    const animeEvts = animeTmdbSet.size > 0
      ? dedupeEvents((await getEvents(configId)).filter((e: any) => e.tmdb_id && animeTmdbSet.has(e.tmdb_id)))
      : [];
    const animeEventVids = animeEvts.slice(0, 100).map((evt: any, i: number) => eventToVideo(evt, i, id));
    const animeVids = av.concat(animeEventVids);

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Anime guardati',
        description: 'I tuoi anime guardati su Trakt.',
        videos: animeVids
      }
    });
  }

  // Ranking confronto utenti
  if (enabled.includes('ranking') && insight.ranking) {
    const r = insight.ranking;
    const id = `adaptive_${configId}_ranking`;
    const rankText = r.hoursRank > 0 ? `#${r.hoursRank} / ${r.totalUsers}` : 'N/D';
    cards.push(await cardMeta(configId, id,
      `Classifica: ${rankText}`,
      `${r.totalUsers} utenti totali · Streak: #${r.streakRank} · Contenuti: #${r.contentRank}`,
      { accent: '#fbbf24', statValue: rankText, statLabel: 'CLASSIFICA' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Confronto con altri utenti',
        description: 'Come ti posizioni rispetto agli altri?',
        videos: [
          video(`${id}_1`, `Ore: #${r.hoursRank} su ${r.totalUsers}`, new Date().toISOString(), `${r.totalUsers} utenti totali.`),
          video(`${id}_2`, `Streak: #${r.streakRank}`, new Date().toISOString(), 'Classifica streak.'),
          video(`${id}_3`, `Contenuti: #${r.contentRank}`, new Date().toISOString(), 'Classifica contenuti.')
        ]
      }
    });
  }

  // Ricordi (Memories)
  if (enabled.includes('memories')) {
    const memories: { year: number; title: string; tmdb_id: number | null; type: string }[] = s.memories || [];
    if (memories.length > 0) {
      const id = `adaptive_${configId}_memories`;
      const memory = memories[0];
      const yearsAgo = new Date().getFullYear() - memory.year;

      cards.push(await cardMeta(configId, id,
        `Ricordi: ${yearsAgo} anni fa guardavi ${memory.title}`,
        `Il ${memory.year} in questo periodo guardavi ${memory.title}.`,
        { accent: '#d946ef', statValue: `${memory.year}`, statLabel: 'RICORDI' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'I tuoi ricordi',
          description: 'Cosa guardavi negli stessi giorni degli anni scorsi.',
          videos: memories.slice(0, 100).map((m: any, i: number) => ({
            id: `${id}_${i}`,
            title: m.title,
            released: new Date().toISOString(),
            overview: `Guardato nel ${m.year}.`,
            tmdb_id: m.tmdb_id || null,
            trakt_type: m.type || 'movie'
          }))
        }
      });
    }
  }

  // Primo contenuto
  if (enabled.includes('firstplay') && s.first_play) {
    const id = `adaptive_${configId}_firstplay`;
    const fp = s.first_play;
    const d = new Date(fp.date);
    const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

    cards.push(await cardMeta(configId, id,
      `Primo contenuto: ${fp.title}`,
      `Il primo contenuto che hai mai registrato su Trakt: ${dateStr}`,
      { accent: '#fbbf24', statValue: `${fp.title}`, statLabel: 'PRIMO' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Il tuo primo contenuto',
        description: 'Il primo contenuto mai registrato su Trakt.',
        videos: [video(`${id}_1`, fp.title, fp.date, `Primo contenuto registrato il ${dateStr}.`)]
      }
    });
  }

  // Giorni totali
  if (enabled.includes('giorni') && s.totalDays !== undefined && s.totalDays > 0) {
    const id = `adaptive_${configId}_giorni`;
    cards.push(await cardMeta(configId, id,
      `${s.totalDays} giorni di visione`,
      `In media ${s.avgPerDay || 0} contenuti al giorno.`,
      { accent: '#06b6d4', statValue: `${s.totalDays}`, statLabel: 'GIORNI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'I tuoi giorni di visione',
        description: 'Quanti giorni hai guardato qualcosa.',
        videos: [video(`${id}_1`, `${s.totalDays} giorni unici`, new Date().toISOString(), `Hai guardato contenuti in ${s.totalDays} giorni diversi.`)]
      }
    });
  }

  // Miglior anno
  if (enabled.includes('migliore') && s.bestYear) {
    const id = `adaptive_${configId}_migliore`;
    const yearData = s.yearlyTotals?.[s.bestYear] || {};
    cards.push(await cardMeta(configId, id,
      `Miglior anno: ${s.bestYear}`,
      `${Math.floor(yearData.hours || 0)} ore, ${yearData.movies || 0} film, ${yearData.episodes || 0} episodi.`,
      { accent: '#fbbf24', statValue: `${s.bestYear}`, statLabel: 'MIGLIOR ANNO' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Il tuo miglior anno',
        description: 'L\'anno con più ore di visione.',
        videos: Object.entries(s.yearlyTotals || {}).sort((a: any, b: any) => b[1].hours - a[1].hours).map(([year, data]: [string, any], i: number) =>
          video(`${id}_${i}`, year, new Date().toISOString(), `${Math.floor(data.hours)} ore, ${data.movies} film, ${data.episodes} episodi.`)
        )
      }
    });
  }

  // Anno in corso
  if (enabled.includes('anno') && s.yearHours !== undefined && s.yearHours > 0) {
    const id = `adaptive_${configId}_anno`;
    const prevYear = String(new Date().getFullYear() - 1);
    const prevHours = s.yearlyTotals?.[prevYear]?.hours || 0;
    const comparison = prevHours > 0 ? `vs ${Math.floor(prevHours)}h l'anno scorso` : 'Nessun dato anno precedente';

    cards.push(await cardMeta(configId, id,
      `${Math.floor(s.yearHours)} ore quest'anno`,
      comparison,
      { accent: '#84cc16', statValue: `${Math.floor(s.yearHours)}h`, statLabel: `ANNO ${new Date().getFullYear()}` }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: `Progresso ${new Date().getFullYear()}`,
        description: 'Quanto hai guardato quest\'anno.',
        videos: Object.entries(s.yearlyTotals || {}).sort((a: any, b: any) => Number(a[0]) - Number(b[0])).map(([year, data]: [string, any], i: number) =>
          video(`${id}_${i}`, year, new Date().toISOString(), `${Math.floor(data.hours)} ore, ${data.movies} film, ${data.episodes} episodi.`)
        )
      }
    });
  }

  // Mese preferito
  if (enabled.includes('mese') && s.bestMonth) {
    const id = `adaptive_${configId}_mese`;
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const monthIdx = monthNames.indexOf(s.bestMonth);

    cards.push(await cardMeta(configId, id,
      `Il tuo mese: ${s.bestMonth}`,
      monthIdx >= 0 ? `È il mese in cui hai guardato di più in assoluto.` : 'Nessun dato sufficiente.',
      { accent: '#a3e635', statValue: s.bestMonth, statLabel: 'MESE TOP' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'I tuoi mesi',
        description: 'Distribuzione delle visioni per mese.',
        videos: monthNames.map((name, i) =>
          video(`${id}_${i}`, name, new Date().toISOString(), `${i === monthIdx ? '⬅ MESE CON PIÙ VISIONI' : ''}`)
        )
      }
    });
  }

  // Split film/serie
  if (enabled.includes('split')) {
    const id = `adaptive_${configId}_split`;
    const totalWatched = s.totalMovies + s.seriesEpisodes;
    const mp = s.moviePct ?? 50;
    const sp = s.showPct ?? 50;

    if (totalWatched > 0) {
      cards.push(await cardMeta(configId, id,
        `${mp}% film · ${sp}% serie`,
        `${s.totalMovies} film, ${s.seriesEpisodes} episodi (${totalWatched} titoli)`,
        { accent: '#2dd4bf', statValue: `${mp}/${sp}`, statLabel: 'FILM/SERIE' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Film vs Serie',
          description: 'Come si dividono le tue visioni.',
          videos: [
            video(`${id}_1`, `${mp}% film (${s.totalMovies})`, new Date().toISOString(), 'Film visti.'),
            video(`${id}_2`, `${sp}% serie (${s.seriesEpisodes} episodi)`, new Date().toISOString(), 'Episodi visti.')
          ]
        }
      });
    }
  }

  // Notturno (time of day)
  if (enabled.includes('notturno') && s.timeOfDay) {
    const id = `adaptive_${configId}_notturno`;
    const td = s.timeOfDay as { morning: number; afternoon: number; evening: number; night: number };
    const totalTd = td.morning + td.afternoon + td.evening + td.night;

    if (totalTd > 0) {
      const labels = [
        { key: 'notte', value: td.night, label: 'Notte (0-6)', color: '#6366f1' },
        { key: 'mattino', value: td.morning, label: 'Mattino (6-12)', color: '#fbbf24' },
        { key: 'pomeriggio', value: td.afternoon, label: 'Pomeriggio (12-18)', color: '#f97316' },
        { key: 'sera', value: td.evening, label: 'Sera (18-24)', color: '#8b5cf6' }
      ].sort((a, b) => b.value - a.value);
      const top = labels[0];
      const topPct = Math.round(top.value / totalTd * 100);
      const itLabels: Record<string, string> = { notte: 'nottambulo', mattino: 'mattiniero', pomeriggio: 'pomeridiano', sera: 'serale' };

      cards.push(await cardMeta(configId, id,
        `Sei ${itLabels[top.key]}: ${topPct}% di ${top.label.toLowerCase()}`,
        `${top.label}: ${top.value} · ${labels[1].label}: ${labels[1].value} · ${labels[2].label}: ${labels[2].value} · ${labels[3].label}: ${labels[3].value}`,
        { accent: top.color, statValue: `${topPct}%`, statLabel: top.label.toUpperCase() }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Le tue fasce orarie',
          description: 'Quando guardi durante il giorno.',
          videos: labels.map((l, i) =>
            video(`${id}_${i}`, l.label, new Date().toISOString(), `${l.value} visioni (${Math.round(l.value / totalTd * 100)}% del totale).`)
          )
        }
      });
    }
  }

  // Attività recente (Events)
  if (enabled.includes('events')) {
    const id = `adaptive_${configId}_events`;
    const recentEvts = dedupeEvents(await getEvents(configId, 7));
    const evtVids = recentEvts.slice(0, 100).map((evt, i) => eventToVideo(evt, i, id));

    cards.push(await cardMeta(configId, id,
      `${recentEvts.length} attività recenti (7gg)`,
      `Film, episodi e anime degli ultimi 7 giorni.`,
      { accent: '#0ea5e9', statValue: `${recentEvts.length}`, statLabel: 'SETTIMANA' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Attività recente',
        description: 'Tutto ciò che hai guardato negli ultimi 7 giorni.',
        videos: evtVids.length > 0 ? evtVids : [video(`${id}_1`, 'Nessuna attività recente', new Date().toISOString(), '')]
      }
    });
  }

  // Ritmo settimanale
  if (enabled.includes('pace') && s.avgPerWeek !== undefined) {
    const id = `adaptive_${configId}_pace`;
    cards.push(await cardMeta(configId, id,
      `${s.avgPerWeek} contenuti a settimana`,
      `${s.totalEvents || 0} totali in ${Math.max(1, Math.round((s.totalEvents || 0) / s.avgPerWeek))} settimane attive.`,
      { accent: '#f59e0b', statValue: `${s.avgPerWeek}`, statLabel: 'MEDIA/SETT' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Il tuo ritmo',
        description: 'Quanto guardi in media ogni settimana.',
        videos: [video(`${id}_1`, `${s.avgPerWeek} a settimana`, new Date().toISOString(), `Media contenuti per settimana attiva.`)]
      }
    });
  }

  // Weekend vs Feriale
  if (enabled.includes('weekend') && s.weekdayPct !== undefined) {
    const id = `adaptive_${configId}_weekend`;
    const isWeekendDominant = s.weekendPct > s.weekdayPct;
    const label = isWeekendDominant ? 'WEEKEND' : 'FERIALI';
    const pct = isWeekendDominant ? s.weekendPct : s.weekdayPct;
    const accent = isWeekendDominant ? '#8b5cf6' : '#38bdf8';
    cards.push(await cardMeta(configId, id,
      `${isWeekendDominant ? '🏖️ Sei del weekend' : '💼 Sei da feriale'}: ${pct}%`,
      `${s.weekdayPct}% feriali · ${s.weekendPct}% weekend`,
      { accent, statValue: `${pct}%`, statLabel: label }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Feriale vs Weekend',
        description: 'Quando guardi di più?',
        videos: [
          video(`${id}_1`, `Feriale: ${s.weekdayPct}%`, new Date().toISOString(), 'Lunedì-Venerdì.'),
          video(`${id}_2`, `Weekend: ${s.weekendPct}%`, new Date().toISOString(), 'Sabato-Domenica.')
        ]
      }
    });
  }

  // Confronto annuale (YoY)
  if (enabled.includes('annuale') && s.yoyChange !== undefined) {
    const id = `adaptive_${configId}_annuale`;
    const sign = s.yoyChange >= 0 ? '+' : '';
    const trend = s.yoyChange > 0 ? '📈' : s.yoyChange < 0 ? '📉' : '➡️';
    cards.push(await cardMeta(configId, id,
      `${trend} ${sign}${s.yoyChange}% anno su anno`,
      `${s.lastYearCount || 0} contenuti ultimo anno vs ${s.prevYearCount || 0} l\'anno prima.`,
      { accent: '#84cc16', statValue: `${sign}${s.yoyChange}%`, statLabel: 'ANNUALE' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Confronto annuale',
        description: 'Come cambiano le tue visioni anno dopo anno.',
        videos: [
          video(`${id}_1`, `Ultimo anno: ${s.lastYearCount || 0}`, new Date().toISOString(), 'Contenuti degli ultimi 12 mesi.'),
          video(`${id}_2`, `Anno prima: ${s.prevYearCount || 0}`, new Date().toISOString(), 'Contenuti dei 12 mesi precedenti.')
        ]
      }
    });
  }

  // Decade più attivo
  if (enabled.includes('decade') && s.topDecade) {
    const id = `adaptive_${configId}_decade`;
    cards.push(await cardMeta(configId, id,
      `Anni ${s.topDecade}: ${s.decadeEvents} contenuti`,
      `Il decennio in cui hai guardato più roba.`,
      { accent: '#06b6d4', statValue: s.topDecade, statLabel: 'DECENNIO' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: `I tuoi anni ${s.topDecade}`,
        description: 'In che decennio guardi di più?',
        videos: [video(`${id}_1`, `${s.topDecade}`, new Date().toISOString(), `${s.decadeEvents} contenuti guardati in questo decennio.`)]
      }
    });
  }

  // Pausa massima
  if (enabled.includes('break') && s.maxBreak !== undefined && s.maxBreak > 0) {
    const id = `adaptive_${configId}_break`;
    const days = s.maxBreak;
    cards.push(await cardMeta(configId, id,
      days >= 365
        ? `Pausa di ${Math.floor(days / 365)} anni e ${Math.floor((days % 365) / 30)} mesi`
        : days >= 30
          ? `Pausa di ${Math.floor(days / 30)} mesi`
          : `Pausa max: ${days} giorni`,
      `Il periodo più lungo senza guardare nulla.`,
      { accent: '#6b7280', statValue: days >= 30 ? `${Math.floor(days / 30)}m` : `${days}g`, statLabel: 'PAUSA MAX' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'La tua pausa più lunga',
        description: 'Per quanto tempo sei stato senza guardare niente.',
        videos: [video(`${id}_1`, `${days} giorni`, new Date().toISOString(), `Periodo più lungo senza visioni.`)]
      }
    });
  }

  // Prime time
  if (enabled.includes('primetime') && s.primeTimePct !== undefined) {
    const id = `adaptive_${configId}_primetime`;
    cards.push(await cardMeta(configId, id,
      `${s.primeTimePct}% delle tue visioni in prima serata`,
      `Guardi soprattutto tra le 20:00 e le 2:00.`,
      { accent: '#6366f1', statValue: `${s.primeTimePct}%`, statLabel: 'PRIME TIME' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Prima serata',
        description: 'Le tue abitudini in fascia serale.',
        videos: [video(`${id}_1`, `${s.primeTimePct}% in prima serata`, new Date().toISOString(), 'Visioni tra le 20:00 e le 2:00.')]
      }
    });
  }

  // Durata media
  if (enabled.includes('avg') && s.avgRuntime !== undefined && s.avgRuntime > 0) {
    const id = `adaptive_${configId}_avg`;
    cards.push(await cardMeta(configId, id,
      `${s.avgRuntime} minuti di media`,
      `La durata media dei tuoi contenuti guardati.`,
      { accent: '#0ea5e9', statValue: `${s.avgRuntime}m`, statLabel: 'DURATA MEDIA' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Durata media',
        description: 'Quanto durano in media i contenuti che guardi.',
        videos: [video(`${id}_1`, `${s.avgRuntime} minuti medi`, new Date().toISOString(), 'Calcolato su tutti i contenuti con durata nota.')]
      }
    });
  }

  // Notturno profondo (0-6)
  if (enabled.includes('night') && s.nightPct !== undefined) {
    const id = `adaptive_${configId}_night`;
    cards.push(await cardMeta(configId, id,
      `${s.nightPct}% delle visioni in piena notte`,
      `Contenuti guardati tra mezzanotte e le 6 del mattino.`,
      { accent: '#312e81', statValue: `${s.nightPct}%`, statLabel: 'NOTTE FONDA' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Notturno',
        description: 'Le tue visioni in piena notte (0:00-6:00).',
        videos: [video(`${id}_1`, `${s.nightPct}% notturno`, new Date().toISOString(), 'Percentuale di contenuti guardati in fascia notturna.')]
      }
    });
  }

  // Serie uniche seguite
  if (enabled.includes('series') && s.uniqueShows !== undefined && s.uniqueShows > 0) {
    const id = `adaptive_${configId}_series`;
    cards.push(await cardMeta(configId, id,
      `${s.uniqueShows} serie seguite, ${s.avgEpisodesPerShow} a testa`,
      `Il numero di serie TV uniche che hai guardato.`,
      { accent: '#8b5cf6', statValue: `${s.uniqueShows}`, statLabel: 'SERIE' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Serie seguite',
        description: 'Quante serie hai seguito e quanti episodi in media.',
        videos: [video(`${id}_1`, `${s.uniqueShows} serie uniche`, new Date().toISOString(), `${s.avgEpisodesPerShow} episodi medi per serie.`)]
      }
    });
  }

  // Vintage — epoca media dei contenuti
  if (enabled.includes('vintage') && allEvents.length > 0) {
    const id = `adaptive_${configId}_vintage`;
    const years = allEvents.filter(e => e.year).map(e => e.year);
    if (years.length > 0) {
      const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
      const oldest = Math.min(...years);
      const newest = Math.max(...years);
      const era = avgYear < 2000 ? 'classici' : avgYear < 2010 ? 'anni 2000' : avgYear < 2020 ? 'anni 2010' : 'recenti';
      cards.push(await cardMeta(configId, id,
        `Contenuti ${era}: media ${avgYear}`,
        `Dal ${oldest} al ${newest} — guardi sia classici che novità.`,
        { accent: '#f97316', statValue: `${avgYear}`, statLabel: 'VINTAGE' }
      ));

      const decadeGroups: Record<string, number> = {};
      for (const y of years) {
        const d = `${Math.floor(y / 10) * 10}s`;
        decadeGroups[d] = (decadeGroups[d] || 0) + 1;
      }
      const decadeVids = Object.entries(decadeGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dec, cnt], i) =>
          video(`${id}_${i}`, dec, new Date().toISOString(), `${cnt} contenuti`)
        );

      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Epoca dei tuoi contenuti',
          description: `Media ${avgYear}, dal ${oldest} al ${newest}.`,
          videos: decadeVids
        }
      });
    }
  }

  // Completamento serie
  if (enabled.includes('completion') && s.uniqueShows !== undefined && s.uniqueShows > 0 && s.dropped?.length) {
    const id = `adaptive_${configId}_completion`;
    const droppedCount = s.dropped.length;
    const completedCount = Math.max(0, s.uniqueShows - droppedCount);
    const pct = Math.round((completedCount / s.uniqueShows) * 100);
    cards.push(await cardMeta(configId, id,
      `Completate ${completedCount} su ${s.uniqueShows} serie (${pct}%)`,
      `${droppedCount} serie in pausa.`,
      { accent: '#22c55e', statValue: `${pct}%`, statLabel: 'COMPLETATE' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Serie completate',
        description: `Hai completato ${completedCount} serie su ${s.uniqueShows}.`,
        videos: [
          video(`${id}_1`, `Completate: ${completedCount}`, new Date().toISOString(), `${pct}% delle serie.`),
          video(`${id}_2`, `In pausa: ${droppedCount}`, new Date().toISOString(), 'Serie da riprendere.')
        ]
      }
    });
  }

  // Tipologia contenuti (film/serie/anime)
  if (enabled.includes('tipologia')) {
    const id = `adaptive_${configId}_tipologia`;
    const movieCnt = s.totalMovies || 0;
    const showCnt = s.seriesEpisodes || 0;
    const animeCnt = s.animeEpisodes || 0;
    const animeMovieCnt = s.animeMovies || 0;
    const total = movieCnt + showCnt + animeCnt + animeMovieCnt;
    if (total > 0) {
      const labels = [
        { name: 'Film', count: movieCnt, hours: s.movieHours || 0, color: '#3b82f6' },
        { name: 'Serie', count: showCnt, hours: s.seriesHours || 0, color: '#8b5cf6' },
        { name: 'Anime', count: animeCnt + animeMovieCnt, hours: s.animeHours || 0, color: '#f43f5e' },
      ].sort((a, b) => b.count - a.count);
      const top = labels[0];
      const topPct = Math.round(top.count / total * 100);
      cards.push(await cardMeta(configId, id,
        `${topPct}% ${top.name.toLowerCase()}: ${top.count}`,
        `${labels.map(l => `${l.count} ${l.name.toLowerCase()}`).join(' · ')}`,
        { accent: top.color, statValue: `${topPct}%`, statLabel: top.name.toUpperCase() }
      ));
      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Film, Serie e Anime',
          description: 'Come si dividono le tue visioni per tipologia.',
          videos: labels.map((l, i) =>
            video(`${id}_${i}`, l.name, new Date().toISOString(), `${l.count} contenuti, ${Math.floor(l.hours)} ore.`)
          )
        }
      });
    }
  }

  // Confronto settimanale
  if (enabled.includes('confronto') && s.weekCount !== undefined && s.prevWeekCount !== undefined) {
    const id = `adaptive_${configId}_confronto`;
    const curr = s.weekCount;
    const prev = s.prevWeekCount || 0;
    const diff = curr - prev;
    const diffText = diff > 0 ? `+${diff} rispetto a 7gg fa` : diff < 0 ? `${diff} rispetto a 7gg fa` : 'invariato';
    const isUp = diff > 0;
    cards.push(await cardMeta(configId, id,
      `${curr} contenuti questa settimana`,
      diffText,
      { accent: isUp ? '#22c55e' : '#ef4444', statValue: `${curr}`, statLabel: 'SETTIMANA' }
    ));
    details.push({
      meta_id: id, meta: {
        id, type: 'movie', name: 'Confronto settimanale',
        description: 'Questa settimana vs la precedente.',
        videos: [
          video(`${id}_1`, `Questa settimana: ${curr}`, new Date().toISOString(), 'Contenuti degli ultimi 7 giorni.'),
          video(`${id}_2`, `Settimana scorsa: ${prev}`, new Date().toISOString(), 'Contenuti dei 7 giorni precedenti.')
        ]
      }
    });
  }

  // Decenni
  if (enabled.includes('decenni') && allEvents.length > 0) {
    const id = `adaptive_${configId}_decenni`;
    const years = allEvents.filter(e => e.year).map(e => e.year);
    if (years.length > 0) {
      const decadeGroups: Record<string, number> = {};
      for (const y of years) {
        const d = `${Math.floor(y / 10) * 10}s`;
        decadeGroups[d] = (decadeGroups[d] || 0) + 1;
      }
      const sorted = Object.entries(decadeGroups).sort(([a], [b]) => a.localeCompare(b));
      const top = sorted[sorted.length - 1] || ['', 0];
      cards.push(await cardMeta(configId, id,
        `Anni ${top[0].replace('s', '')}: ${top[1]} contenuti`,
        `${sorted.length} decenni coperti, dal ${sorted[0][0].replace('s', '')} al ${sorted[sorted.length - 1][0].replace('s', '')}.`,
        { accent: '#06b6d4', statValue: `${top[1]}`, statLabel: top[0].replace('s', '') }
      ));
      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'I tuoi decenni',
          description: 'Distribuzione delle tue visioni per decennio.',
          videos: sorted.map(([dec, cnt], i) =>
            video(`${id}_${i}`, dec.replace('s', ''), new Date().toISOString(), `${cnt} contenuti`)
          )
        }
      });
    }
  }

  // Revisioni (rewatch)
  if (enabled.includes('revisioni')) {
    const id = `adaptive_${configId}_revisioni`;
    const seriesRw = (s.seriesRewatch as any[]) || [];
    const animeRw = (s.animeRewatch as any[]) || [];
    const totalRw = seriesRw.length + animeRw.length;
    if (totalRw > 0) {
      const rwLabels = [
        { name: 'Serie riviste', count: seriesRw.length, color: '#8b5cf6' },
        { name: 'Anime rivisti', count: animeRw.length, color: '#f43f5e' },
      ].sort((a, b) => b.count - a.count);
      const topRw = rwLabels[0];
      cards.push(await cardMeta(configId, id,
        `${totalRw} titoli rivisti, ${topRw.count} ${topRw.name.toLowerCase()}`,
        `${seriesRw.length} serie · ${animeRw.length} anime`,
        { accent: topRw.color, statValue: `${totalRw}`, statLabel: 'RIVISTI' }
      ));
      const rwVids = [...seriesRw, ...animeRw].slice(0, 100).map((r: any, i: number) => ({
        id: `${id}_${i}`,
        title: r.title,
        released: new Date().toISOString(),
        overview: `Rivisto ${r.count} volte.`,
        tmdb_id: r.tmdb_id || null,
        trakt_type: r.type || 'movie'
      }));
      details.push({
        meta_id: id, meta: {
          id, type: 'movie', name: 'Titoli rivisti',
          description: 'Serie e anime che hai guardato più di una volta.',
          videos: rwVids
        }
      });
    }
  }

  // Arricchisce ogni video con thumbnail
  for (const d of details) {
    if (d.meta?.videos?.length) {
      d.meta.videos = d.meta.videos.map((v: any, i: number) => {
        if (v.thumbnail) return v;
        const posterFallback = `${baseUrl}/vposter/${configId}/${encodeURIComponent(d.meta_id)}/${i}.png`;
        return { ...v, thumbnail: posterFallback };
      });
    }
  }

  await supabase.from('adaptive_rows').upsert({
    config_id: configId,
    catalog_id: INSIGHT_CATALOG_ID,
    metas: cards,
    updated_at: new Date().toISOString()
  }, { onConflict: 'config_id,catalog_id' });

  for (const d of details) {
    await supabase.from('adaptive_meta').upsert({
      config_id: configId,
      meta_id: d.meta_id,
      meta: d.meta,
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_id,meta_id' });
  }
}
