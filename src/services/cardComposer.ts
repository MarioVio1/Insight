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

  const enabled = prefs?.enabled_card_types || ['totals', 'weekly', 'genre', 'recurring', 'rewatch', 'seasonal'];
  const cards: any[] = [];
  const details: { meta_id: string; meta: any }[] = [];

  if (enabled.includes('totals')) {
    const id = `adaptive_${configId}_totals`;
    cards.push(
      await cardMeta(
        id,
        `${insight.summary.movieCount} film nel tuo viaggio`,
        `Finora hai accumulato ${insight.summary.movieCount} film, ${insight.summary.episodeCount} episodi e ${insight.summary.totalHours} ore di visione.`,
        null,
        null,
        insight.rewatch_titles?.[0]?.title || insight.recurring_titles?.[0]?.title,
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
          video(`${id}_1`, `${insight.summary.movieCount} film visti`, new Date().toISOString(), 'Totale film presenti nella tua cronologia.'),
          video(`${id}_2`, `${insight.summary.episodeCount} episodi visti`, new Date().toISOString(), 'Totale episodi registrati nel tuo profilo.'),
          video(`${id}_3`, `${insight.summary.totalHours} ore guardate`, new Date().toISOString(), 'Tempo totale stimato dai runtime disponibili.')
        ]
      }
    });
  }

  if (enabled.includes('weekly')) {
    const id = `adaptive_${configId}_weekly`;
    const weeklyTitle = insight.summary.topWeeklyTitle
      ? `Settimana scorsa eri dentro ${insight.summary.topWeeklyTitle}`
      : `${insight.summary.lastWeekCount} visioni negli ultimi 7 giorni`;

    const weeklyDesc = insight.summary.topWeeklyTitle
      ? `Negli ultimi 7 giorni questo è stato il tuo titolo dominante, con ${insight.summary.topWeeklyCount} passaggi registrati.`
      : 'Una card che segue il tuo ritmo più recente.';

    cards.push(
      await cardMeta(id, weeklyTitle, weeklyDesc, null, null, insight.summary.topWeeklyTitle, '#38bdf8')
    );

    details.push({
      meta_id: id,
      meta: {
        id,
        type: 'series',
        name: 'Il tuo ritmo settimanale',
        description: 'Cosa ti ha preso davvero nell’ultima settimana.',
        videos: [
          video(`${id}_1`, `${insight.summary.lastWeekCount} attività recenti`, new Date().toISOString(), 'Conteggio totale degli ultimi 7 giorni.'),
          video(
            `${id}_2`,
            insight.summary.topWeeklyTitle || 'Nessun titolo dominante',
            new Date().toISOString(),
            insight.summary.topWeeklyTitle
              ? `Hai guardato questo contenuto ${insight.summary.topWeeklyCount} volte nella settimana.`
              : 'Questa settimana non c’è ancora un titolo dominante.'
          )
        ]
      }
    });
  }

  if (enabled.includes('genre') && insight.summary.topGenre) {
    const id = `adaptive_${configId}_genre`;
    cards.push(
      await cardMeta(
        id,
        `Il tuo mood ora è ${insight.summary.topGenre}`,
        'Questo è il genere che racconta meglio il tuo profilo in questo momento.',
        null,
        null,
        insight.recurring_titles?.[0]?.title || insight.rewatch_titles?.[0]?.title,
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
        videos: (insight.genre_counts || []).slice(0, 10).map((g: any, i: number) =>
          video(`${id}_${i}`, g.name, new Date().toISOString(), `${g.count} visioni associate a questo genere.`)
        )
      }
    });
  }

  if (enabled.includes('recurring')) {
    const id = `adaptive_${configId}_recurring`;
    cards.push(
      await cardMeta(
        id,
        'Hai delle ricorrenze tutte tue',
        'Alcuni titoli o abitudini stanno tornando nello stesso periodo dell’anno.',
        null,
        null,
        insight.recurring_titles?.[0]?.title,
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
        videos: (insight.recurring_titles || []).slice(0, 12).map((r: any, i: number) =>
          video(`${id}_${i}`, r.title, new Date().toISOString(), `Questo titolo compare ${r.count} volte nello stesso mese attraverso gli anni.`)
        )
      }
    });
  }

  if (enabled.includes('rewatch')) {
    const id = `adaptive_${configId}_rewatch`;
    cards.push(
      await cardMeta(
        id,
        'I tuoi comfort rewatch',
        'Ci sono titoli verso cui torni più spesso del normale.',
        null,
        null,
        insight.rewatch_titles?.[0]?.title,
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
        videos: (insight.rewatch_titles || []).slice(0, 12).map((r: any, i: number) =>
          video(`${id}_${i}`, r.title, new Date().toISOString(), `Hai rivisto questo titolo ${r.count} volte.`)
        )
      }
    });
  }

  if (enabled.includes('seasonal')) {
    const id = `adaptive_${configId}_seasonal`;

    const seasonText =
      insight.seasonal_key === 'christmas'
        ? 'L’anno scorso in questo periodo avevi già iniziato il tuo mood natalizio.'
        : insight.seasonal_key === 'halloween'
        ? 'C’è odore di horror di stagione nel tuo profilo.'
        : insight.seasonal_key === 'summer'
        ? 'L’estate tende a riaccendere maratone e rewatch più leggeri.'
        : 'Questa card cambia con il calendario e con il tuo profilo.';

    const seasonalAccent =
      insight.seasonal_key === 'christmas'
        ? '#dc2626'
        : insight.seasonal_key === 'halloween'
        ? '#f97316'
        : insight.seasonal_key === 'summer'
        ? '#f59e0b'
        : '#0ea5e9';

    cards.push(
      await cardMeta(
        id,
        'La stagione ti sta cambiando',
        seasonText,
        null,
        null,
        insight.recurring_titles?.[0]?.title || insight.rewatch_titles?.[0]?.title,
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
          video(`${id}_1`, insight.seasonal_key, new Date().toISOString(), seasonText)
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
