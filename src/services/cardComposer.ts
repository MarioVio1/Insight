import { supabase } from './supabase.js';
import { generateSvgPoster } from './artworkService.js';

function posterUrl(configId: string, cardId: string): string {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  return `${base}/poster/${configId}/${cardId}.png`;
}

async function cardMeta(
  id: string,
  name: string,
  description: string,
  configId: string,
  opts?: { accent?: string; statValue?: string; statLabel?: string }
) {
  const accent = opts?.accent || '#0ea5e9';
  const svg = generateSvgPoster({
    title: name,
    subtitle: description.slice(0, 50),
    accent,
    statValue: opts?.statValue,
    statLabel: opts?.statLabel
  });

  return {
    id,
    type: 'movie',
    name,
    poster: posterUrl(configId, id),
    background: posterUrl(configId, id),
    description,
    posterShape: 'poster',
    genres: ['Insights'],
    statValue: opts?.statValue || null,
    statLabel: opts?.statLabel || null
  };
}

function video(id: string, title: string, released: string, overview: string) {
  return { id, title, released, overview };
}

export async function rebuildAdaptiveRow(configId: string) {
  const cfgRes = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  const insightRes = await supabase.from('insight_snapshots').select('*').eq('config_id', configId).maybeSingle();
  const prefsRes = await supabase.from('config_preferences').select('*').eq('config_id', configId).maybeSingle();

  const cfg = cfgRes.data;
  const insight = insightRes.data;
  const prefs = prefsRes.data;

  if (!cfg || !insight) return;

  const s = insight.summary || {};
  const enabled = prefs?.enabled_card_types || ['totals', 'weekly', 'genre', 'recurring', 'rewatch', 'seasonal', 'streak', 'binge'];
  const cards: any[] = [];
  const details: { meta_id: string; meta: any }[] = [];

  // Totali
  if (enabled.includes('totals')) {
    const id = `adaptive_${configId}_totals`;
    const totalHours = s.totalHours || 0;
    const uc = s.uniqueTitles || 0;
    const totalM = s.totalMovies || 0;
    const totalE = s.totalEpisodes || 0;
    const mh = s.movieHours || 0;
    const eh = s.episodeHours || 0;

    cards.push(await cardMeta(id,
      `${Math.floor(totalHours)} ore di visione`,
      `${totalM} film (${Math.floor(mh)}h) · ${totalE} episodi (${Math.floor(eh)}h) · ${uc} titoli`,
      configId, { accent: '#22c55e', statValue: `${Math.floor(totalHours)}h`, statLabel: 'TOTALI' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Il tuo viaggio totale',
        description: 'Tutto quello che hai guardato su Trakt.',
        videos: [
          video(`${id}_1`, `${totalM} film visti (${Math.floor(mh)} ore)`, new Date().toISOString(), 'Totale film.'),
          video(`${id}_2`, `${totalE} episodi visti (${Math.floor(eh)} ore)`, new Date().toISOString(), 'Totale episodi.'),
          video(`${id}_3`, `${Math.floor(totalHours)} ore guardate`, new Date().toISOString(), 'Tempo totale.'),
          video(`${id}_4`, `${uc} titoli unici`, new Date().toISOString(), 'Contenuti distinti.')
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

    cards.push(await cardMeta(id,
      `Binge: ${topBinge.episodes} episodi di ${topBinge.title}`,
      `Hai guardato ${topBinge.episodes} episodi di fila di ${topBinge.title} in un giorno.`,
      configId, { accent: '#ef4444', statValue: `${topBinge.episodes}`, statLabel: 'BINGE MAX' }
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
    cards.push(await cardMeta(id,
      `${s.dropped.length} serie in pausa`,
      `Serie che non guardi da mesi. Forse è ora di riprenderle?`,
      configId, { accent: '#6b7280', statValue: `${s.dropped.length}`, statLabel: 'IN PAUSA' }
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

  // Rewatch
  if (enabled.includes('rewatch')) {
    const rewatchTitles = insight.rewatch_titles || [];
    if (rewatchTitles.length > 0) {
      const id = `adaptive_${configId}_rewatch`;
      cards.push(await cardMeta(id,
        `Rivisto: ${rewatchTitles[0].title} (${rewatchTitles[0].count}x)`,
        `Titoli che hai guardato più di una volta.`,
        configId, { accent: '#ef4444', statValue: `${rewatchTitles[0].count}x`, statLabel: 'REWATCH' }
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
    const seasonTexts: Record<string, string> = {
      christmas: "L'anno scorso in questo periodo avevi già iniziato il mood natalizio.",
      halloween: 'C\'è odore di horror di stagione nel tuo profilo.',
      summer: 'L\'estate tende a riaccendere maratone e rewatch più leggeri.',
      standard: 'Questa card cambia con il calendario e con il tuo profilo.'
    };
    const seasonAccents: Record<string, string> = {
      christmas: '#dc2626', halloween: '#f97316', summer: '#f59e0b', standard: '#0ea5e9'
    };

    cards.push(await cardMeta(id,
      `Stagione: ${seasonalKey}`,
      seasonTexts[seasonalKey] || seasonTexts.standard,
      configId, { accent: seasonAccents[seasonalKey] || seasonAccents.standard, statValue: seasonalKey.toUpperCase(), statLabel: 'STAGIONE' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'La stagione del tuo profilo',
        description: seasonTexts[seasonalKey] || seasonTexts.standard,
        videos: [video(`${id}_1`, seasonalKey, new Date().toISOString(), seasonTexts[seasonalKey] || seasonTexts.standard)]
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
    cards.push(await cardMeta(id,
      `${s.animeCount} anime guardati`,
      `${Math.floor(ah)} ore passate con gli anime.`,
      configId, { accent: '#f43f5e', statValue: `${s.animeCount}`, statLabel: 'ANIME' }
    ));

    details.push({
      meta_id: id, meta: {
        id, type: 'series', name: 'Statistiche anime',
        description: 'I tuoi anime guardati su Trakt.',
        videos: [
          video(`${id}_1`, `${s.animeCount} anime visti`, new Date().toISOString(), 'Totale episodi/film anime.'),
          video(`${id}_2`, `${Math.floor(ah)} ore di anime`, new Date().toISOString(), 'Tempo speso con gli anime.')
        ]
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

  const finalCards = cards.slice(0, prefs?.max_cards || 10);

  await supabase.from('adaptive_rows').upsert({
    config_id: configId,
    catalog_id: 'adaptive-insights',
    metas: finalCards,
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
