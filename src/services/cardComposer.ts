import { supabase } from './supabase.js';
import { generateSvgPoster } from './artworkService.js';
import { fetchTmdbDetails } from './tmdbService.js';

function posterUrl(configId: string, cardId: string): string {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  return `${base}/poster/${configId}/${cardId}.png`;
}

async function cardMeta(
  id: string,
  name: string,
  description: string,
  configId: string,
  opts?: { accent?: string; statValue?: string; statLabel?: string; imageUrl?: string; rating?: number }
) {
  const accent = opts?.accent || '#0ea5e9';
  const svg = generateSvgPoster({
    title: name,
    subtitle: description.slice(0, 50),
    accent,
    statValue: opts?.statValue,
    statLabel: opts?.statLabel,
    imageUrl: opts?.imageUrl
  });

  const meta: any = {
    id,
    type: 'movie',
    name,
    poster: posterUrl(configId, id),
    background: posterUrl(configId, id),
    description,
    posterShape: 'poster',
    genres: ['Insights'],
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

export async function rebuildAdaptiveRow(configId: string) {
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
  const prefs = prefsRes.data;

  if (!cfg) { console.error('Config not found for', configId); return; }
  if (!insight) { console.error('Insight not found for', configId, '- run sync first'); return; }

  const s = insight.summary || {};
  const saved = prefs?.enabled_card_types || [];
  const allEnabled = ['totals','streak','peak','weekly','genre','binge','dropped','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking','memories','giorni','migliore','anno','mese','split','notturno'];
  const enabled = saved.length > 0 ? [...new Set([...saved, ...allEnabled])] : allEnabled;
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

    cards.push(await cardMeta(id,
      `${Math.floor(totalHours)} ore di visione`,
      `${totalM} film · ${seriesE} episodi · ${animeC} anime · ${uc} titoli`,
      configId, { accent: '#22c55e', statValue: `${Math.floor(totalHours)}h`, statLabel: 'TOTALI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Il tuo viaggio totale',
        description: 'Tutto quello che hai guardato su Trakt.',
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
    cards.push(await cardMeta(id,
      streak === 1 ? 'Ieri hai guardato qualcosa' : `${streak} giorni di streak!`,
      streak > 0 ? `Sono ${streak} giorni consecutivi che guardi almeno un contenuto.` : 'Nessuna streak attiva.',
      configId, { accent: '#f97316', statValue: `${streak}`, statLabel: 'GIORNI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'La tua streak',
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
    cards.push(await cardMeta(id,
      `Il tuo orario di punta: ${hourStr}`,
      `Alle ${hourStr} hai registrato ${ph.count} visioni, più di ogni altra ora.`,
      configId, { accent: '#a855f7', statValue: hourStr, statLabel: 'ORA PREFERITA' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Il tuo orario preferito',
        description: 'Quando guardi di più?',
        videos: [video(`${id}_1`, `${hourStr}`, new Date().toISOString(), `${ph.count} visioni in questa fascia oraria.`)]
      }
    });
  }

  // Top day
  if (enabled.includes('weekly') && s.topDay) {
    const id = `adaptive_${configId}_day`;
    const td = s.topDay;
    cards.push(await cardMeta(id,
      `Il tuo giorno: ${td.name}`,
      `Di ${td.name} hai totalizzato ${td.count} visioni, il giorno più attivo della settimana.`,
      configId, { accent: '#38bdf8', statValue: td.name, statLabel: 'GIORNO TOP' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Giorni della settimana',
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

    cards.push(await cardMeta(id,
      `Il tuo genere: ${tg}`,
      `${tg} domina con ${genreCounts.find((g: any) => g.name === tg)?.count || 0} visioni.`,
      configId, { accent: '#a855f7', statValue: tg, statLabel: 'GENERE TOP' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'I tuoi generi',
        description: 'Quali generi guardi di più.',
        videos: genreCounts.slice(0, 10).map((g: any, i: number) =>
          video(`${id}_${i}`, g.name, new Date().toISOString(), `${g.count} visioni (${totalG > 0 ? Math.round(g.count / totalG * 100) : 0}% del totale).`)
        )
      }
    });
  }

  // Binge
  if (enabled.includes('binge') && s.binges && s.binges.length > 0) {
    const id = `adaptive_${configId}_binge`;
    const topBinge = s.binges[0];

    let imageUrl = '';
    let rating: number | null = null;
    if (topBinge.tmdb_id) {
      try { const d = await fetchTmdbDetails(topBinge.tmdb_id, 'tv'); imageUrl = d.poster || ''; rating = d.rating; } catch {}
    }

    cards.push(await cardMeta(id,
      `Binge: ${topBinge.episodes} episodi di ${topBinge.title}`,
      `Hai guardato ${topBinge.episodes} episodi di fila di ${topBinge.title} in un giorno.`,
      configId, { accent: '#ef4444', statValue: `${topBinge.episodes}`, statLabel: 'BINGE MAX', imageUrl, rating: rating || undefined }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Le tue maratone',
        description: 'I giorni in cui hai guardato più episodi della stessa serie.',
        videos: s.binges.slice(0, 10).map((b: any, i: number) =>
          video(`${id}_${i}`, b.title, b.date, `${b.episodes} episodi in un giorno.`)
        )
      }
    });
  }

  // Dropped
  if (enabled.includes('dropped') && s.dropped && s.dropped.length > 0) {
    const id = `adaptive_${configId}_dropped`;

    let imageUrl = '';
    let rating: number | null = null;
    if (s.dropped[0].tmdb_id) {
      try { const d = await fetchTmdbDetails(s.dropped[0].tmdb_id, 'tv'); imageUrl = d.poster || ''; rating = d.rating; } catch {}
    }

    cards.push(await cardMeta(id,
      `${s.dropped.length} serie in pausa`,
      `Serie che non guardi da mesi. Forse è ora di riprenderle?`,
      configId, { accent: '#6b7280', statValue: `${s.dropped.length}`, statLabel: 'IN PAUSA', imageUrl, rating: rating || undefined }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Serie in pausa',
        description: 'Serie che non guardi da più di 3 mesi.',
        videos: s.dropped.slice(0, 10).map((d: any, i: number) =>
          video(`${id}_${i}`, d.title, d.lastDate, `${d.totalEpisodes} episodi visti, ultima volta ${new Date(d.lastDate).toLocaleDateString('it-IT')}.`)
        )
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

    cards.push(await cardMeta(id,
      `${curr} contenuti questo mese`,
      diffText,
      configId, { accent: '#14b8a6', statValue: `${curr}`, statLabel: 'QUESTO MESE' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Confronto mensile',
        description: 'Quanto guardi ogni mese.',
        videos: [
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
      cards.push(await cardMeta(id,
        `${recurringTitles.length} titoli ricorrenti`,
        `Titoli che torni a guardare ogni anno nello stesso periodo.`,
        configId, { accent: '#f59e0b', statValue: `${recurringTitles.length}`, statLabel: 'RICORRENTI' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'Le tue ricorrenze',
          description: 'Titoli che guardi sempre nello stesso mese.',
          videos: recurringTitles.slice(0, 12).map((r: any, i: number) =>
            video(`${id}_${i}`, r.title, new Date().toISOString(), `Visto ${r.count} volte nei mesi: ${r.months.join(', ')}.`)
          )
        }
      });
    }
  }

  // Rewatch (solo serie TV, gli anime sono nella card anime)
  if (enabled.includes('rewatch')) {
    const rewatchTitles = s.seriesRewatch || insight.rewatch_titles || [];
    if (rewatchTitles.length > 0) {
      const id = `adaptive_${configId}_rewatch`;
      const topRewatch = rewatchTitles[0];

      let imageUrl = '';
      let rating: number | null = null;
      if (topRewatch.tmdb_id) {
        try {
          const mediaType = topRewatch.type === 'movie' ? 'movie' : 'tv';
          const d = await fetchTmdbDetails(topRewatch.tmdb_id, mediaType);
          imageUrl = d.poster || '';
          rating = d.rating;
        } catch {}
      }

      cards.push(await cardMeta(id,
        `Rivisto: ${topRewatch.title} (${topRewatch.count}x)`,
        `Titoli che hai guardato più di una volta.`,
        configId, { accent: '#ef4444', statValue: `${topRewatch.count}x`, statLabel: 'REWATCH', imageUrl, rating: rating || undefined }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'I tuoi comfort rewatch',
          description: 'Quelli che non guardi una volta sola.',
          videos: rewatchTitles.slice(0, 12).map((r: any, i: number) =>
            video(`${id}_${i}`, r.title, new Date().toISOString(), `Rivisto ${r.count} volte.`)
          )
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
      ? `Più visti: ${seasonalTitles.slice(0, 5).map((t: any) => t.title).join(', ')}`
      : (seasonTexts[seasonalKey] || seasonTexts.standard);

    cards.push(await cardMeta(id,
      `Stagione: ${seasonalKey}`,
      desc,
      configId, { accent: seasonAccents[seasonalKey] || seasonAccents.standard, statValue: seasonalKey.toUpperCase(), statLabel: 'STAGIONE' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'La stagione del tuo profilo',
        description: desc,
        videos: seasonalTitles.length > 0
          ? seasonalTitles.map((t: any, i: number) =>
              video(`${id}_${i}`, t.title, new Date().toISOString(), `Visto ${t.count} volte in questa stagione.`)
            )
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
      cards.push(await cardMeta(id,
        `Attore: ${top.name}`,
        `Appare in ${top.count} dei tuoi contenuti guardati.`,
        configId, { accent: '#ec4899', statValue: top.name, statLabel: 'ATTORE TOP' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'Attori preferiti',
          description: 'Gli attori che vedi più spesso.',
          videos: actors.map((a: any, i: number) =>
            video(`${id}_${i}`, a.name, new Date().toISOString(), `Appare in ${a.count} contenuti.`)
          )
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
      cards.push(await cardMeta(id,
        `Regista: ${top.name}`,
        `Compare in ${top.count} dei tuoi contenuti.`,
        configId, { accent: '#8b5cf6', statValue: top.name, statLabel: 'REGISTA TOP' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'Registi preferiti',
          description: 'I registi che guardi di più.',
          videos: directors.map((d: any, i: number) =>
            video(`${id}_${i}`, d.name, new Date().toISOString(), `Compare in ${d.count} contenuti.`)
          )
        }
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
    cards.push(await cardMeta(id,
      `${s.animeCount} anime guardati`,
      `${am} film · ${ae} episodi · ${Math.floor(ah)} ore`,
      configId, { accent: '#f43f5e', statValue: `${s.animeCount}`, statLabel: 'ANIME' }
    ));

    const av: any[] = [
      video(`${id}_1`, `${am} film anime visti`, new Date().toISOString(), 'Film anime.'),
      video(`${id}_2`, `${ae} episodi anime visti`, new Date().toISOString(), 'Episodi anime.'),
      video(`${id}_3`, `${Math.floor(ah)} ore di anime`, new Date().toISOString(), 'Tempo speso con gli anime.')
    ];
    if (ab.length > 0) av.push(video(`${id}_4`, `Binge anime max: ${ab[0].title} (${ab[0].episodes}ep)`, new Date().toISOString(), 'Maggior numero di episodi anime in un giorno.'));
    if (ad.length > 0) av.push(video(`${id}_5`, `${ad.length} anime in pausa`, new Date().toISOString(), 'Anime che non guardi da mesi.'));
    if (ar.length > 0) av.push(video(`${id}_6`, `${ar[0].title} rivisto ${ar[0].count}x`, new Date().toISOString(), 'Anime più rivisto.'));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Statistiche anime',
        description: 'I tuoi anime guardati su Trakt.',
        videos: av
      }
    });
  }

  // Ranking confronto utenti
  if (enabled.includes('ranking') && insight.ranking) {
    const r = insight.ranking;
    const id = `adaptive_${configId}_ranking`;
    const rankText = r.hoursRank > 0 ? `#${r.hoursRank} / ${r.totalUsers}` : 'N/D';
    cards.push(await cardMeta(id,
      `Classifica: ${rankText}`,
      `${r.totalUsers} utenti totali · Streak: #${r.streakRank} · Contenuti: #${r.contentRank}`,
      configId, { accent: '#fbbf24', statValue: rankText, statLabel: 'CLASSIFICA' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Confronto con altri utenti',
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

      let imageUrl = '';
      let rating: number | null = null;
      if (memory.tmdb_id) {
        try {
          const mediaType = memory.type === 'movie' ? 'movie' : 'tv';
          const d = await fetchTmdbDetails(memory.tmdb_id, mediaType);
          imageUrl = d.poster || '';
          rating = d.rating;
        } catch {}
      }

      cards.push(await cardMeta(id,
        `Ricordi: ${yearsAgo} anni fa guardavi ${memory.title}`,
        `Il ${memory.year} in questo periodo guardavi ${memory.title}.`,
        configId, { accent: '#d946ef', statValue: `${memory.year}`, statLabel: 'RICORDI', imageUrl, rating: rating || undefined }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'I tuoi ricordi',
          description: 'Cosa guardavi negli stessi giorni degli anni scorsi.',
          videos: memories.slice(0, 10).map((m: any, i: number) =>
            video(`${id}_${i}`, m.title, new Date().toISOString(), `Guardato nel ${m.year}.`)
          )
        }
      });
    }
  }

  // Giorni totali
  if (enabled.includes('giorni') && s.totalDays !== undefined && s.totalDays > 0) {
    const id = `adaptive_${configId}_giorni`;
    cards.push(await cardMeta(id,
      `${s.totalDays} giorni di visione`,
      `In media ${s.avgPerDay || 0} contenuti al giorno.`,
      configId, { accent: '#06b6d4', statValue: `${s.totalDays}`, statLabel: 'GIORNI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'I tuoi giorni di visione',
        description: 'Quanti giorni hai guardato qualcosa.',
        videos: [video(`${id}_1`, `${s.totalDays} giorni unici`, new Date().toISOString(), `Hai guardato contenuti in ${s.totalDays} giorni diversi.`)]
      }
    });
  }

  // Miglior anno
  if (enabled.includes('migliore') && s.bestYear) {
    const id = `adaptive_${configId}_migliore`;
    const yearData = s.yearlyTotals?.[s.bestYear] || {};
    cards.push(await cardMeta(id,
      `Miglior anno: ${s.bestYear}`,
      `${Math.floor(yearData.hours || 0)} ore, ${yearData.movies || 0} film, ${yearData.episodes || 0} episodi.`,
      configId, { accent: '#fbbf24', statValue: `${s.bestYear}`, statLabel: 'MIGLIOR ANNO' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Il tuo miglior anno',
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

    cards.push(await cardMeta(id,
      `${Math.floor(s.yearHours)} ore quest'anno`,
      comparison,
      configId, { accent: '#84cc16', statValue: `${Math.floor(s.yearHours)}h`, statLabel: `ANNO ${new Date().getFullYear()}` }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: `Progresso ${new Date().getFullYear()}`,
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

    cards.push(await cardMeta(id,
      `Il tuo mese: ${s.bestMonth}`,
      monthIdx >= 0 ? `È il mese in cui hai guardato di più in assoluto.` : 'Nessun dato sufficiente.',
      configId, { accent: '#a3e635', statValue: s.bestMonth, statLabel: 'MESE TOP' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'I tuoi mesi',
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
      cards.push(await cardMeta(id,
        `${mp}% film · ${sp}% serie`,
        `${s.totalMovies} film, ${s.seriesEpisodes} episodi (${totalWatched} titoli)`,
        configId, { accent: '#2dd4bf', statValue: `${mp}/${sp}`, statLabel: 'FILM/SERIE' }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'Film vs Serie',
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

      cards.push(await cardMeta(id,
        `Sei ${itLabels[top.key]}: ${topPct}% di ${top.label.toLowerCase()}`,
        `${top.label}: ${top.value} · ${labels[1].label}: ${labels[1].value} · ${labels[2].label}: ${labels[2].value} · ${labels[3].label}: ${labels[3].value}`,
        configId, { accent: top.color, statValue: `${topPct}%`, statLabel: top.label.toUpperCase() }
      ));

      details.push({
        meta_id: id, meta: {
          id, type: 'series', name: 'Le tue fasce orarie',
          description: 'Quando guardi durante il giorno.',
          videos: labels.map((l, i) =>
            video(`${id}_${i}`, l.label, new Date().toISOString(), `${l.value} visioni (${Math.round(l.value / totalTd * 100)}% del totale).`)
          )
        }
      });
    }
  }

  await supabase.from('adaptive_rows').upsert({
    config_id: configId,
    catalog_id: 'adaptive-insights',
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