import { supabase } from './supabase.js';
import { listProfiles } from './profileService.js';

function meta(id: string, name: string, description: string, poster?: string, background?: string, genres: string[] = ['Stats']) {
  return {
    id,
    type: 'movie',
    name,
    poster,
    background,
    description,
    genres
  };
}

export async function rebuildCardCache(configId: string) {
  const { data: stats } = await supabase.from('stats_snapshots').select('*').eq('config_id', configId).maybeSingle();
  const profiles = await listProfiles(configId);
  const cards: Record<string, any[]> = {
    'stats-overview': [],
    'this-month': [],
    'recurring-habits': [],
    'top-genres': [],
    'top-people': [],
    'rewatch-insights': [],
    'profiles': []
  };

  if (stats) {
    cards['stats-overview'].push(
      meta(`stats_${configId}_movies`, `${stats.movies_watched} film visti`, 'Totale film registrati nella tua history Trakt.', undefined, undefined, ['Stats','Movies']),
      meta(`stats_${configId}_episodes`, `${stats.episodes_watched} episodi visti`, 'Totale episodi registrati nella tua history Trakt.', undefined, undefined, ['Stats','Series']),
      meta(`stats_${configId}_minutes`, `${Math.round((stats.total_watch_minutes || 0) / 60)} ore viste`, 'Tempo totale di visione stimato dai runtime disponibili.', undefined, undefined, ['Stats','Time'])
    );

    if (stats.top_genre) {
      cards['this-month'].push(meta(`stats_${configId}_genre`, `Genere top: ${stats.top_genre}`, 'Il genere più frequente nella tua attività recente.', undefined, undefined, ['Genre']));
      cards['top-genres'].push(...(stats.genre_counts || []).map((g: any, i: number) => meta(`genre_${configId}_${i}`, `${g.name}`, `${g.count} visualizzazioni collegate a questo genere.`, undefined, undefined, ['Genre'])));
    }

    if (stats.top_person) {
      cards['top-people'].push(...(stats.people_counts || []).map((p: any, i: number) => meta(`person_${configId}_${i}`, `${p.name}`, `${p.count} occorrenze nella tua cronologia tra cast e crew.`, undefined, undefined, ['People'])));
    }

    if (stats.recurring_month_number) {
      cards['recurring-habits'].push(meta(`recurring_${configId}_month`, `Ricorrenza mensile: mese ${stats.recurring_month_number}`, `Questo mese compare spesso nei tuoi pattern storici: ${stats.recurring_month_count} attività.`, undefined, undefined, ['Recurring']));
    }

    cards['rewatch-insights'].push(...(stats.rewatches || []).map((r: any, i: number) => meta(`rewatch_${configId}_${i}`, `${r.name}`, `Hai rivisto questo titolo ${r.count} volte.`, undefined, undefined, ['Rewatch'])));
  }

  cards['profiles'].push(...profiles.map((p: any) => meta(`profile_${p.id}`, p.name, p.is_default ? 'Profilo principale' : 'Profilo secondario', p.avatar_url || undefined, undefined, ['Profile'])));

  for (const [catalogId, metas] of Object.entries(cards)) {
    await supabase.from('card_cache').upsert({
      config_id: configId,
      catalog_id: catalogId,
      metas,
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_id,catalog_id' });
  }
}
