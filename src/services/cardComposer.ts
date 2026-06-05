import { supabase } from './supabase.js';
import { findArtworkForTitle, generateSvgPoster } from './artworkService.js';

async function cardMeta(id: string, name: string, description: string, poster: string | null, background: string | null, artworkQuery?: string, accent?: string) {
  const art = artworkQuery ? await findArtworkForTitle(artworkQuery) : { poster: null, background: null };
  const finalPoster = poster || art.poster || generateSvgPoster({ title: name, subtitle: description.slice(0, 44), accent });
  const finalBackground = background || art.background || finalPoster;
  return {
    id,
    type: 'series',
    name,
    poster: finalPoster || undefined,
    background: finalBackground || undefined,
    description,
    posterShape: 'poster',
    genres: ['Insights']
  };
}

function video(id: string, title: string, released: string, overview: string) {
  const art = artworkQuery ? await findArtworkForTitle(artworkQuery) : { poster: null, background: null };
  const finalPoster = poster || art.poster || generateSvgPoster({ title: name, subtitle: description.slice(0, 44), accent });
  const finalBackground = background || art.background || finalPoster;
  return {
    id,
    title,
    released,
    overview
  };
}

export async function rebuildAdaptiveRow(configId: string) {
  const { data: cfg } = await supabase.from('addon_configs').select('*').eq('id', configId).single();
  const { data: insight } = await supabase.from('insight_snapshots').select('*').eq('config_id', configId).maybeSingle();
  const { data: prefs } = await supabase.from('config_preferences').select('*').eq('config_id', configId).maybeSingle();
  if (!cfg || !insight) return;

  const enabled = prefs?.enabled_card_types || ['totals','weekly','genre','recurring','rewatch','seasonal'];
  const cards: any[] = [];
  const details: { meta_id: string; meta: any }[] = [];

  if (enabled.includes('totals')) {
    const id = `adaptive_${configId}_totals`;
    cards.push(await cardMeta(id, `${insight.summary.movieCount} film visti`, `Hai visto ${insight.summary.movieCount} film e ${insight.summary.episodeCount} episodi finora.`, null, null, insight.rewatch_titles?.[0]?.title || insight.recurring_titles?.[0]?.title, '#22c55e'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Film visti finora', description: 'Panoramica totale del tuo profilo di visione.', videos: [
        video(`${id}_1`, `${insight.summary.movieCount} film`, new Date().toISOString(), 'Totale film registrati in cronologia.'),
        video(`${id}_2`, `${insight.summary.episodeCount} episodi`, new Date().toISOString(), 'Totale episodi registrati in cronologia.'),
        video(`${id}_3`, `${insight.summary.totalHours} ore`, new Date().toISOString(), 'Stima ore viste dai runtime disponibili.')
      ]
    }});
  }

  if (enabled.includes('weekly')) {
    const id = `adaptive_${configId}_weekly`;
    cards.push(await cardMeta(id, `${insight.summary.lastWeekCount} visioni questa settimana`, insight.summary.topWeeklyTitle ? `Titolo più presente: ${insight.summary.topWeeklyTitle}` : 'Attività recente del profilo.', null, null, insight.summary.topWeeklyTitle, '#38bdf8'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Questa settimana', description: 'Insight recenti e contenuti che ti hanno preso negli ultimi 7 giorni.', videos: [
        video(`${id}_1`, `${insight.summary.lastWeekCount} visioni`, new Date().toISOString(), 'Conteggio attività negli ultimi 7 giorni.'),
        video(`${id}_2`, insight.summary.topWeeklyTitle || 'Nessun titolo dominante', new Date().toISOString(), insight.summary.topWeeklyTitle ? `Hai visto questo contenuto ${insight.summary.topWeeklyCount} volte negli ultimi 7 giorni.` : 'Non c’è un titolo dominante questa settimana.')
      ]
    }});
  }

  if (enabled.includes('genre') && insight.summary.topGenre) {
    const id = `adaptive_${configId}_genre`;
    cards.push(await cardMeta(id, `Mood dominante: ${insight.summary.topGenre}`, `Il genere più rappresentativo del tuo profilo in questo momento è ${insight.summary.topGenre}.`, null, null, insight.recurring_titles?.[0]?.title || insight.rewatch_titles?.[0]?.title, '#a855f7'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Top generi', description: 'Generi che definiscono il tuo profilo.', videos: (insight.genre_counts || []).slice(0, 10).map((g: any, i: number) => video(`${id}_${i}`, g.name, new Date().toISOString(), `${g.count} visioni associate a questo genere.`))
    }});
  }

  if (enabled.includes('recurring')) {
    const id = `adaptive_${configId}_recurring`;
    cards.push(await cardMeta(id, `Ricorrenze del mese`, 'Confronta il mese attuale con gli stessi periodi degli anni precedenti.', null, null, insight.recurring_titles?.[0]?.title, '#f59e0b'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Ricorrenze del mese', description: 'Titoli o abitudini che ritornano nello stesso periodo.', videos: (insight.recurring_titles || []).slice(0, 12).map((r: any, i: number) => video(`${id}_${i}`, r.title, new Date().toISOString(), `Questo titolo compare ${r.count} volte nello stesso mese attraverso gli anni.`))
    }});
  }

  if (enabled.includes('rewatch')) {
    const id = `adaptive_${configId}_rewatch`;
    cards.push(await cardMeta(id, 'Comfort rewatch', 'Titoli che tornano spesso nella tua storia.', null, null, insight.rewatch_titles?.[0]?.title, '#ef4444'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Comfort rewatch', description: 'I tuoi contenuti più rivisti.', videos: (insight.rewatch_titles || []).slice(0, 12).map((r: any, i: number) => video(`${id}_${i}`, r.title, new Date().toISOString(), `Hai rivisto questo titolo ${r.count} volte.`))
    }});
  }

  if (enabled.includes('seasonal')) {
    const id = `adaptive_${configId}_seasonal`;
    const seasonText = insight.seasonal_key === 'christmas'
      ? 'L’anno scorso nello stesso periodo avevi già iniziato la tua stagione natalizia.'
      : insight.seasonal_key === 'halloween'
      ? 'Il tuo periodo horror potrebbe essere già in movimento.'
      : insight.seasonal_key === 'summer'
      ? 'L’estate tende a riportarti verso i rewatch e le maratone leggere.'
      : 'Questa card si adatta alle stagioni e alle ricorrenze del tuo profilo.';
    cards.push(await cardMeta(id, 'Stagione del momento', seasonText, null, null, insight.recurring_titles?.[0]?.title || insight.rewatch_titles?.[0]?.title, insight.seasonal_key === 'christmas' ? '#dc2626' : insight.seasonal_key === 'halloween' ? '#f97316' : insight.seasonal_key === 'summer' ? '#f59e0b' : '#0ea5e9'));
    details.push({ meta_id: id, meta: {
      id, type: 'series', name: 'Stagione del momento', description: 'Card adattiva che cambia grafica e messaggio in base al calendario.', videos: [
        video(`${id}_1`, insight.seasonal_key, new Date().toISOString(), seasonText)
      ]
    }});
  }

  const finalCards = cards.slice(0, prefs?.max_cards || parseInt(process.env.DEFAULT_CARD_COUNT || '10', 10));

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
