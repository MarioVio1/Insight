import { supabase } from './supabase.js';
import { findArtworkForTitle, generateSvgPoster } from './artworkService.js';

async function cardMeta(
  id: string,
  name: string,
  description: string,
  poster: string | null,
  background: string | null,
  artworkQuery?: string,
  accent?: string
) {
  const art = artworkQuery
    ? await findArtworkForTitle(artworkQuery)
    : { poster: null, background: null, source: 'none' };

  const finalPoster =
    poster ||
    art.poster ||
    generateSvgPoster({
      title: name,
      subtitle: description.slice(0, 44),
      accent
    });

  const finalBackground = background || art.background || finalPoster;

  return {
    id,
    type: 'movie',
    name,
    poster: finalPoster || undefined,
    background: finalBackground || undefined,
    description,
    posterShape: 'poster',
    genres: ['Insights']
  };
}

function video(id: string, title: string, released: string, overview: string) {
  return { id, title, released, overview };
}

/**
 * Rebuild the adaptive insights row for a config.
 * This version:
 *  - uses real stats from Trakt events
 *  - finds recurring & rewatch titles
 *  - builds card previews with poster/background from artwork or SVG
 *  - builds meta details with full metadata and videos
 */
export async function rebuildAdaptiveRow(configId: string) {
  const cfgRes = await supabase
    .from('addon_configs')
    .select('*')
    .eq('id', configId)
    .single();

  const insightRes = await supabase
    .from('insight_snapshots')
    .select('*')
    .eq('config_id', configId)
    .maybeSingle();

  const prefsRes = await supabase
    .from('config_preferences')
    .select('*')
    .eq('config_id', configId)
    .maybeSingle();

  const cfg = cfgRes.data;
  const insight = insightRes.data;
  const prefs = prefsRes.data;

  if (!cfg || !insight) return;

  const summary = insight.summary || {};
  const enabled = prefs?.enabled_card_types || ['totals', 'weekly', 'genre', 'recurring', 'rewatch', 'seasonal'];
  const cards: any[] = [];
  const details: { meta_id: string; meta: any }[] = [];

  if (enabled.includes('totals')) {
    const id = `adaptive_${configId}_totals`;
    const movieCount = summary.movieCount || 0;
    const episodeCount = summary.episodeCount || 0;
    const totalHours = summary.totalHours || 0;

    cards.push(
      await cardMeta(
        id,
        `${movieCount} film nel tuo viaggio`,
        `Finora hai accumulato ${movieCount} film, ${episodeCount} episodi e ${totalHours} ore di visione.`,
        null,
        null,
        null,
        '#22c55e'
      )
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'Il tuo viaggio finora',
        description: 'Una panoramica completa del tuo profilo di visione.',
        videos: [
          video(`${id}_1`, `${movieCount} film visti`, new Date().toISOString(), 'Totale film presenti nella tua cronologia.'),
          video(`${id}_2`, `${episodeCount} episodi visti`, new Date().toISOString(), 'Totale episodi registrati nel tuo profilo.'),
          video(`${id}_3`, `${totalHours} ore guardate`, new Date().toISOString(), 'Tempo totale stimato dai runtime disponibili.')
        ]
      }
    });
  }

  if (enabled.includes('weekly')) {
    const id = `adaptive_${configId}_weekly`;
    const topWeeklyTitle = summary.topWeeklyTitle || null;
    const topWeeklyCount = summary.topWeeklyCount || 0;
    const lastWeekCount = summary.lastWeekCount || 0;

    const weeklyTitle = topWeeklyTitle
      ? `Settimana scorsa eri dentro ${topWeeklyTitle}`
      : `${lastWeekCount} visioni negli ultimi 7 giorni`;

    const weeklyDesc = topWeeklyTitle
      ? `Negli ultimi 7 giorni questo è stato il tuo titolo dominante, con ${topWeeklyCount} passaggi registrati.`
      : 'Una card che segue il tuo ritmo più recente.';

    cards.push(await cardMeta(id, weeklyTitle, weeklyDesc, null, null, topWeeklyTitle, '#38bdf8'));

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'Il tuo ritmo settimanale',
        description: 'Cosa ti ha preso davvero nell'ultima settimana.',
        videos: [
          video(`${id}_1`, `${lastWeekCount} attività recenti`, new Date().toISOString(), 'Conteggio totale degli ultimi 7 giorni.'),
          video(
            `${id}_2`,
            topWeeklyTitle || 'Nessun titolo dominante',
            new Date().toISOString(),
            topWeeklyTitle
              ? `Hai guardato questo contenuto ${topWeeklyCount} volte nella settimana.`
              : 'Questa settimana non c'è®© ancora un titolo dominante.'
          )
        ]
      }
    });
  }

  if (enabled.includes('genre') && summary.topGenre) {
    const id = `adaptive_${configId}_genre`;
    const topGenre = summary.topGenre || '';
    const genreCounts = summary.genre_counts || [];

    cards.push(
      await cardMeta(
        id,
        `Il tuo mood ora è ${topGenre}`,
        'Questo è il genere che racconta meglio il tuo profilo in questo momento.',
        null,
        null,
        null,
        '#a855f7'
      )
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'I generi che ti definiscono',
        description: 'Una lettura veloce del tuo gusto attuale.',
        videos: genreCounts.slice(0, 10).map((g: any, i: number) =>
          video(`${id}_${i}`, g.name, new Date().toISOString(), `${g.count} visioni associate a questo genere.`)
        )
      }
    });
  }

  if (enabled.includes('recurring')) {
    const id = `adaptive_${configId}_recurring`;
    const recurringTitles = insight.recurring_titles || [];

    cards.push(
      await cardMeta(
        id,
        'Hai delle ricorrenze tutte tue',
        'Alcuni titoli o abitudini stanno tornando nello stesso periodo dell'anno.',
        null,
        null,
        recurringTitles[0]?.title,
        '#f59e0b'
      )
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'Le tue ricorrenze',
        description: 'Pattern che tornano nel tempo e raccontano il tuo lato più personale.',
        videos: recurringTitles.slice(0, 12).map((r: any, i: number) =>
          video(`${id}_${i}`, r.title, new Date().toISOString(), `Questo titolo compare ${r.count} volte nello stesso mese attraverso gli anni.`)
        )
      }
    });
  }

  if (enabled.includes('rewatch')) {
    const id = `adaptive_${configId}_rewatch`;
    const rewatchTitles = insight.rewatch_titles || [];

    cards.push(
      await cardMeta(
        id,
        'I tuoi comfort rewatch',
        'Ci sono titoli verso cui torni più spesso del normale.',
        null,
        null,
        rewatchTitles[0]?.title,
        '#ef4444'
      )
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'I tuoi titoli del cuore',
        description: 'Quelli che non guardi una volta sola.',
        videos: rewatchTitles.slice(0, 12).map((r: any, i: number) =>
          video(`${id}_${i}`, r.title, new Date().toISOString(), `Hai rivisto questo titolo ${r.count} volte.`)
        )
      }
    });
  }

  if (enabled.includes('seasonal')) {
    const id = `adaptive_${configId}_seasonal`;
    const seasonalKey = insight.seasonal_key || 'standard';
    const recurringTitles = insight.recurring_titles || [];
    const rewatchTitles = insight.rewatch_titles || [];

    const seasonText =
      seasonalKey === 'christmas'
        ? 'L'anno scorso in questo periodo avevi già iniziato il tuo mood natalizio.'
        : seasonalKey === 'halloween'
        ? 'C'è©® odore di horror di stagione nel tuo profilo.'
        : seasonalKey === 'summer'
        ? 'L'estate tende a riaccendere maratone e rewatch più leggeri.'
        : 'Questa card cambia con il calendario e con il tuo profilo.';

    const seasonalAccent =
      seasonalKey === 'christmas'
        ? '#dc2626'
        : seasonalKey === 'halloween'
        ? '#f97316'
        : seasonalKey === 'summer'
        ? '#f59e0b'
        : '#0ea5e9';

    cards.push(
      await cardMeta(
        id,
        'La stagione ti sta cambiando',
        seasonText,
        null,
        null,
        recurringTitles[0]?.title || rewatchTitles[0]?.title,
        seasonalAccent
      )
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'La stagione del tuo profilo',
        description: 'Un insight che cambia grafica e significato in base al periodo.',
        videos: [
          video(`${id}_1`, seasonalKey, new Date().toISOString(), seasonText)
        ]
      }
    });
  }

  const finalCards = cards.slice(0, prefs?.max_cards || 10);

  await supabase.from('adaptive_rows').upsert(
    {
      config_id: configId,
      catalog_id: 'adaptive-insights',
      metas: finalCards,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'config_id,catalog_id' }
  );

  for (const d of details) {
    await supabase.from('adaptive_meta').upsert(
      {
        config_id: configId,
        meta_id: d.meta_id,
        meta: d.meta,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'config_id,meta_id' }
    );
  }
}
