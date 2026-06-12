export type Locale = 'it' | 'en';

function getLocale(): Locale {
  return (process.env.LOCALE as Locale) || 'it';
}

const locales: Record<string, { it: string; en: string }> = {
  // Manifest
  manifestName: { it: 'Adaptive Insights', en: 'Adaptive Insights' },
  manifestDescription: {
    it: 'Statistiche personali Trakt nella home di Stremio. 40+ card dinamiche: streak, binge, generi, attori, anime e molto altro.',
    en: 'Personal Trakt statistics in your Stremio home screen. 40+ dynamic cards: streak, binge, genres, actors, anime and much more.'
  },
  catalogName: { it: 'Insight', en: 'Insight' },
  catalogSetup: { it: 'Insight (configura)', en: 'Insight (setup)' },
  setupTitle: { it: '⚙️ Configura l\'addon', en: '⚙️ Setup the addon' },
  setupPosterFallback: { it: 'Configura', en: 'Setup' },
  setupPosterSub: { it: 'Connetti Trakt e fai il sync', en: 'Connect Trakt and sync' },
  setupDesc: { it: 'Collega Trakt e sincronizza per vedere le tue statistiche.', en: 'Connect Trakt and sync to see your statistics.' },
  noDesc: { it: 'Nessuna descrizione', en: 'No description' },

  // Card titles & descriptions
  totalsTitle: { it: '{h} ore di visione', en: '{h} hours watched' },
  totalsDesc: { it: '{m} film, {e} episodi ({u} titoli unici).', en: '{m} movies, {e} episodes ({u} unique titles).' },
  totalsLabel: { it: 'TOTALI', en: 'TOTALS' },
  streakTitle: { it: '{n} giorni di streak!', en: '{n} day streak!' },
  streakDesc: { it: 'Giorni consecutivi con almeno una visione.', en: 'Consecutive days with at least one watch.' },
  streakLabel: { it: 'STREAK', en: 'STREAK' },
  peakTitle: { it: 'Picco alle {h}:00 ({c} contenuti)', en: 'Peak at {h}:00 ({c} contents)' },
  peakDesc: { it: 'L\'ora in cui guardi di più.', en: 'Your most watched hour.' },
  peakLabel: { it: 'PICCO', en: 'PEAK' },
  weeklyTitle: { it: '{d} è il tuo giorno più visto', en: '{d} is your most watched day' },
  weeklyDesc: { it: '{c} contenuti di giovedì.', en: '{c} contents on {d}.' },
  weeklyLabel: { it: 'GIORNO TOP', en: 'TOP DAY' },
  genreTitle: { it: '{g} è il tuo genere preferito', en: '{g} is your favorite genre' },
  genreDesc: { it: '{c} visioni in questo genere.', en: '{c} watches in this genre.' },
  genreLabel: { it: 'GENERE TOP', en: 'TOP GENRE' },
  bingeTitle: { it: 'Maratona: {t} ({e}ep)', en: 'Binge: {t} ({e}ep)' },
  bingeDesc: { it: '{e} episodi in un giorno. {d} maratone totali.', en: '{e} episodes in one day. {d} binges total.' },
  bingeLabel: { it: 'MARATONE', en: 'BINGES' },
  droppedTitle: { it: '{n} serie in pausa', en: '{n} shows on hold' },
  droppedDesc: { it: 'Serie non guardate da oltre 3 mesi.', en: 'Shows not watched in over 3 months.' },
  droppedLabel: { it: 'IN PAUSA', en: 'ON HOLD' },
  monthlyTitle: { it: '{m}: {c} contenuti', en: '{m}: {c} contents' },
  monthlyDesc: { it: 'Confronto mese per mese.', en: 'Month-by-month comparison.' },
  monthlyLabel: { it: 'MENSILE', en: 'MONTHLY' },
  recurringTitle: { it: '{n} titoli ricorrenti', en: '{n} recurring titles' },
  recurringDesc: { it: 'Titoli che torni a guardare ogni anno nello stesso periodo.', en: 'Titles you rewatch yearly around the same time.' },
  recurringLabel: { it: 'RICORRENTI', en: 'RECURRING' },
  rewatchTitle: { it: '{n} comfort rewatch', en: '{n} comfort rewatches' },
  rewatchDesc: { it: 'Titoli che hai guardato più di una volta.', en: 'Titles you have watched more than once.' },
  rewatchLabel: { it: 'REWATCH', en: 'REWATCH' },

  // Person cards
  actorTitle: { it: 'Attore: {n}', en: 'Actor: {n}' },
  actorDesc: { it: 'Appare in {c} dei tuoi contenuti guardati.', en: 'Appears in {c} of your watched content.' },
  actorLabel: { it: 'ATTORE TOP', en: 'TOP ACTOR' },
  directorTitle: { it: 'Regista: {n}', en: 'Director: {n}' },
  directorDesc: { it: 'Compare in {c} dei tuoi contenuti.', en: 'Appears in {c} of your content.' },
  directorLabel: { it: 'REGISTA TOP', en: 'TOP DIRECTOR' },
  writerTitle: { it: 'Sceneggiatore: {n}', en: 'Writer: {n}' },
  writerDesc: { it: 'Compare in {c} dei tuoi contenuti.', en: 'Appears in {c} of your content.' },
  writerLabel: { it: 'SCENEGGIATORE', en: 'TOP WRITER' },
  splitRoleTitle: { it: '{r}: {n}', en: '{r}: {n}' },
  splitRoleDesc: { it: 'Compare in {c} contenuti {m}.', en: 'Appears in {c} {m} content.' },
  actorRoleLabel: { it: 'ATTORE {m}', en: '{m} ACTOR' },
  directorRoleLabel: { it: 'REGISTA {m}', en: '{m} DIRECTOR' },
  writerRoleLabel: { it: 'SCENEGGIATORE {m}', en: '{m} WRITER' },
  roleNameActor: { it: 'Attore {m}', en: '{m} Actor' },
  roleNameDirector: { it: 'Regista {m}', en: '{m} Director' },
  roleNameWriter: { it: 'Sceneggiatore {m}', en: '{m} Writer' },

  // Time of day cards
  notturnoTitle: { it: '{p}% delle visioni di notte', en: '{p}% of watches at night' },
  notturnoDesc: { it: '{c} contenuti tra mezzanotte e le 6.', en: '{c} contents between midnight and 6am.' },
  notturnoLabel: { it: 'NOTTAMBULO', en: 'NIGHT OWL' },
  matinieroTitle: { it: '{p}% delle visioni al mattino', en: '{p}% of watches in the morning' },
  matinieroDesc: { it: '{c} contenuti tra le 6 e le 12.', en: '{c} contents between 6am and 12pm.' },
  matinieroLabel: { it: 'MATTINO', en: 'MORNING' },
  pomeriggioTitle: { it: '{p}% delle visioni al pomeriggio', en: '{p}% of watches in the afternoon' },
  pomeriggioDesc: { it: '{c} contenuti tra le 12 e le 18.', en: '{c} contents between 12pm and 6pm.' },
  pomeriggioLabel: { it: 'POMERIGGIO', en: 'AFTERNOON' },
  nightLabel: { it: 'NOTTE', en: 'NIGHT' },

  // Anime cards
  animeTitle: { it: '{n} anime guardati', en: '{n} anime watched' },
  animeDesc: { it: 'Ecco i tuoi anime.', en: 'Your anime stats.' },
  animeLabel: { it: 'ANIME', en: 'ANIME' },

  // Ranking
  rankingTitle: { it: '{n}º per ore tra {u} utenti', en: '{n}th for hours among {u} users' },
  rankingDesc: { it: '{s}º streak · {c}º contenuti.', en: '{s}th streak · {c}th content.' },
  rankingLabel: { it: 'RANKING', en: 'RANKING' },

  // Memories
  memoriesTitle: { it: 'Ricordi: {y} anni fa guardavi {t}', en: 'Memories: {y} years ago you watched {t}' },
  memoriesDesc: { it: 'Il {y} in questo periodo guardavi {t}.', en: 'In {y} around this time you watched {t}.' },
  memoriesLabel: { it: 'RICORDI', en: 'MEMORIES' },
  memoriesName: { it: 'I tuoi ricordi', en: 'Your memories' },
  memoriesMetaDesc: { it: 'Cosa guardavi negli stessi giorni degli anni scorsi.', en: 'What you watched on the same days in past years.' },

  // Events
  eventsTitle: { it: '{n} attività recenti (7gg)', en: '{n} recent events (7d)' },
  eventsDesc: { it: 'Film, episodi e anime degli ultimi 7 giorni.', en: 'Movies, episodes and anime from the last 7 days.' },
  eventsLabel: { it: 'SETTIMANA', en: 'WEEK' },

  // Pace
  paceTitle: { it: '{p}/settimana', en: '{p}/week' },
  paceDesc: { it: 'Media settimanale.', en: 'Weekly average.' },
  paceLabel: { it: 'RITMO', en: 'PACE' },

  // Weekend
  weekendTitle: { it: '{p}% nei weekend ({w} vs {d})', en: '{p}% on weekends ({w} vs {d})' },
  weekendDesc: { it: 'Confronto weekend vs giorni feriali.', en: 'Weekend vs weekday comparison.' },
  weekendLabel: { it: 'WEEKEND', en: 'WEEKEND' },

  // Year cards
  miglioreTitle: { it: 'Il tuo anno migliore: {y}', en: 'Your best year: {y}' },
  miglioreDesc: { it: '{c} contenuti nel {y}', en: '{c} contents in {y}' },
  miglioreLabel: { it: 'MIGLIORE', en: 'BEST' },
  annoTitle: { it: '{y}: {c} contenuti ({yoy}% vs anno prima)', en: '{y}: {c} contents ({yoy}% vs last year)' },
  annoDesc: { it: 'Il tuo anno in corso.', en: 'Your current year.' },
  annoLabel: { it: 'ANNO', en: 'YEAR' },

  // Seasonal
  seasonalLabel: { it: 'STAGIONE', en: 'SEASON' },

  // First play
  firstplayTitle: { it: 'Prima visione: {t} ({y})', en: 'First watch: {t} ({y})' },
  firstplayDesc: { it: 'Il primo contenuto che hai tracciato su Trakt.', en: 'The first content you tracked on Trakt.' },
  firstplayLabel: { it: 'PRIMA VOLTA', en: 'FIRST TIME' },

  // Genre variety
  varietaTitle: { it: '{n} generi diversi', en: '{n} different genres' },
  varietaDesc: { it: 'I tuoi generi principali: {g}.', en: 'Your main genres: {g}.' },
  varietaLabel: { it: 'GENERI', en: 'GENRES' },

  // Explorer card
  esploratoreTitle: { it: '{i} {n}: {p}% unici', en: '{i} {n}: {p}% unique' },
  esploratoreDesc: { it: '{u} titoli unici su {t} totali ({r} rewatch).', en: '{u} unique titles out of {t} total ({r} rewatches).' },
  esploratoreLabel: { it: 'UNICITÀ', en: 'UNIQUENESS' },

  // Intensity
  intensitaTitle: { it: '{i} Intensità {l}: {v} al giorno', en: '{i} Intensity {l}: {v} per day' },
  intensitaDesc: { it: '{e} contenuti in {d} giorni attivi.', en: '{e} contents in {d} active days.' },
  intensitaLabel: { it: 'INTENSITÀ', en: 'INTENSITY' },

  // Watch time
  tipologiaName: { it: 'Film, Serie e Anime', en: 'Movies, Series and Anime' },
  tipologiaDesc: { it: 'Come si dividono le tue visioni per tipologia.', en: 'How your watches break down by type.' },

  // Decenni
  decenniName: { it: 'I tuoi decenni', en: 'Your decades' },
  decenniDesc: { it: 'Distribuzione delle tue visioni per decennio.', en: 'Distribution of your watches by decade.' },

  // Revisioni
  revisioniName: { it: 'Titoli rivisti', en: 'Rewatched titles' },
  revisioniDesc: { it: 'Serie e anime che hai guardato più di una volta.', en: 'Series and anime you watched more than once.' },

  // Comparison
  confrontoTitle: { it: '{c} contenuti questa settimana', en: '{c} contents this week' },
  confrontoLabel: { it: 'SETTIMANA', en: 'WEEK' },

  // Genre top5
  top5genresName: { it: 'I tuoi 5 generi', en: 'Your top 5 genres' },
  top5genresDesc: { it: 'I generi che guardi di più.', en: 'The genres you watch the most.' },

  // Bilancio anime
  bilancioAnimeName: { it: 'Bilancio Anime', en: 'Anime Balance' },
  bilancioAnimeLabel: { it: 'ANIME', en: 'ANIME' },

  // Split
  splitName: { it: 'Film vs Serie', en: 'Movies vs Series' },
  splitDesc: { it: 'Come si dividono le tue visioni tra film e serie.', en: 'How your watches split between movies and series.' },
  splitLabel: { it: 'SPLIT', en: 'SPLIT' },

  // Giorni
  giorniName: { it: 'Giorni con visioni', en: 'Days with watches' },
  giorniDesc: { it: 'In quanti giorni hai guardato qualcosa.', en: 'How many days you watched something.' },
  giorniLabel: { it: 'GIORNI', en: 'DAYS' },

  // Mese
  meseName: { it: 'Il tuo mese migliore', en: 'Your best month' },
  meseDesc: { it: 'Il mese in cui hai guardato di più.', en: 'The month you watched the most.' },
  meseLabel: { it: 'MESE', en: 'MONTH' },

  // Firstplay
  firstplayName: { it: 'Prima visione su Trakt', en: 'First watch on Trakt' },
  firstplayVideoTitle: { it: '{t} ({y})', en: '{t} ({y})' },

  // Anniversary
  annualeName: { it: 'Confronto annuale', en: 'Year over Year' },
  annualeDesc: { it: 'Come sei messo rispetto all\'anno scorso.', en: 'How you compare to last year.' },
  annualeLabel: { it: 'ANNUALE', en: 'YEARLY' },

  // Prime time
  primetimeName: { it: 'Fascia serale', en: 'Prime time' },
  primetimeLabel: { it: 'SERA', en: 'EVENING' },

  // Decade
  decadeName: { it: 'Il tuo decennio', en: 'Your decade' },
  decadeLabel: { it: 'DECENNIO', en: 'DECADE' },

  // Break
  breakName: { it: 'Pausa più lunga', en: 'Longest break' },
  breakLabel: { it: 'PAUSA', en: 'BREAK' },

  // Avg
  avgName: { it: 'Media runtime', en: 'Average runtime' },
  avgLabel: { it: 'MEDIA', en: 'AVERAGE' },

  // Night
  nightName: { it: 'Fascia notturna', en: 'Night time' },

  // Series
  seriesName: { it: 'Serie uniche', en: 'Unique series' },
  seriesLabel: { it: 'SERIE', en: 'SERIES' },

  // Vintage
  vintageName: { it: 'Vintage', en: 'Vintage' },
  vintageLabel: { it: 'VINTAGE', en: 'VINTAGE' },

  // Completion
  completionName: { it: 'Tasso di completamento', en: 'Completion rate' },
  completionLabel: { it: 'COMPLETATI', en: 'COMPLETED' },

  // Weekday names
  mon: { it: 'Lunedì', en: 'Monday' },
  tue: { it: 'Martedì', en: 'Tuesday' },
  wed: { it: 'Mercoledì', en: 'Wednesday' },
  thu: { it: 'Giovedì', en: 'Thursday' },
  fri: { it: 'Venerdì', en: 'Friday' },
  sat: { it: 'Sabato', en: 'Saturday' },
  sun: { it: 'Domenica', en: 'Sunday' },

  // Overview text for person videos
  appearsIn: { it: 'Appare in {c} contenuti.', en: 'Appears in {c} content.' },
  compareIn: { it: 'Compare in {c} contenuti.', en: 'Appears in {c} content.' },
  appearsInRole: { it: 'Compare in {c} contenuti {m}.', en: 'Appears in {c} {m} content.' },

  // Rewatch
  rewatchTimes: { it: 'Rivisto {c} volte.', en: 'Rewatched {c} times.' },
  rewatchCompact: { it: '{t} ({c}x)', en: '{t} ({c}x)' },

  // Binge overview
  bingeOverview: { it: '{e} episodi in un giorno.', en: '{e} episodes in one day.' },
  droppedOverview: { it: '{e} episodi visti, ultima volta {d}.', en: '{e} episodes watched, last time {d}.' },
  recurringOverview: { it: 'Visto {c} volte nei mesi: {m}.', en: 'Watched {c} times in months: {m}.' },
  seasonalOverview: { it: 'Visto {c} volte in questa stagione.', en: 'Watched {c} times this season.' },
  memoryOverview: { it: 'Guardato nel {y}.', en: 'Watched in {y}.' },

  // Rating
  ratingLabel: { it: 'RATING', en: 'RATING' },

  // Time of day video labels
  nightTime: { it: 'Notte', en: 'Night' },
  morningTime: { it: 'Mattino', en: 'Morning' },
  afternoonTime: { it: 'Pomeriggio', en: 'Afternoon' },
  eveningTime: { it: 'Sera', en: 'Evening' },

  // Configurator — enabled card types translated names
  card_totals: { it: 'Totali', en: 'Totals' },
  card_streak: { it: 'Streak', en: 'Streak' },
  card_peak: { it: 'Picco orario', en: 'Peak hour' },
  card_weekly: { it: 'Giorno preferito', en: 'Favorite day' },
  card_genre: { it: 'Genere preferito', en: 'Favorite genre' },
  card_binge: { it: 'Maratone', en: 'Binges' },
  card_dropped: { it: 'Serie in pausa', en: 'Shows on hold' },
  card_monthly: { it: 'Confronto mensile', en: 'Monthly comparison' },
  card_recurring: { it: 'Ricorrenti', en: 'Recurring' },
  card_rewatch: { it: 'Rewatch', en: 'Rewatch' },
  card_seasonal: { it: 'Stagionale', en: 'Seasonal' },
  card_actor: { it: 'Attore top', en: 'Top actor' },
  card_director: { it: 'Regista top', en: 'Top director' },
  card_writer: { it: 'Sceneggiatore top', en: 'Top writer' },
  card_top5genres: { it: 'Top 5 generi', en: 'Top 5 genres' },
  card_anime: { it: 'Anime', en: 'Anime' },
  card_ranking: { it: 'Ranking', en: 'Ranking' },
  card_memories: { it: 'Ricordi', en: 'Memories' },
  card_firstplay: { it: 'Prima visione', en: 'First watch' },
  card_giorni: { it: 'Giorni attivi', en: 'Active days' },
  card_migliore: { it: 'Migliore anno', en: 'Best year' },
  card_anno: { it: 'Anno corrente', en: 'Current year' },
  card_mese: { it: 'Migliore mese', en: 'Best month' },
  card_split: { it: 'Film vs Serie', en: 'Movie vs Series' },
  card_notturno: { it: 'Nottambulo', en: 'Night owl' },
  card_events: { it: 'Attività recenti', en: 'Recent events' },
  card_pace: { it: 'Ritmo settimanale', en: 'Weekly pace' },
  card_weekend: { it: 'Weekend', en: 'Weekend' },
  card_annuale: { it: 'Confronto annuale', en: 'Year over year' },
  card_primetime: { it: 'Fascia serale', en: 'Prime time' },
  card_decade: { it: 'Decennio top', en: 'Top decade' },
  card_break: { it: 'Pausa più lunga', en: 'Longest break' },
  card_avg: { it: 'Runtime medio', en: 'Average runtime' },
  card_night: { it: 'Notte fonda', en: 'Deep night' },
  card_series: { it: 'Serie uniche', en: 'Unique series' },
  card_vintage: { it: 'Vintage', en: 'Vintage' },
  card_completion: { it: 'Completamento', en: 'Completion' },
  card_movieActors: { it: 'Attori film', en: 'Movie actors' },
  card_seriesActors: { it: 'Attori serie', en: 'Series actors' },
  card_animeActors: { it: 'Attori anime', en: 'Anime actors' },
  card_movieDirectors: { it: 'Registi film', en: 'Movie directors' },
  card_seriesDirectors: { it: 'Registi serie', en: 'Series directors' },
  card_animeDirectors: { it: 'Registi anime', en: 'Anime directors' },
  card_movieWriters: { it: 'Sceneggiatori film', en: 'Movie writers' },
  card_seriesWriters: { it: 'Sceneggiatori serie', en: 'Series writers' },
  card_animeWriters: { it: 'Sceneggiatori anime', en: 'Anime writers' },
  card_tipologia: { it: 'Tipologia', en: 'Content type' },
  card_confronto: { it: 'Confronto settimanale', en: 'Weekly comparison' },
  card_decenni: { it: 'Decenni', en: 'Decades' },
  card_revisioni: { it: 'Revisioni', en: 'Rewatch breakdown' },
  card_varieta: { it: 'Varietà generi', en: 'Genre variety' },
  card_matiniero: { it: 'Matiniero', en: 'Morning person' },
  card_intensita: { it: 'Intensità', en: 'Intensity' },
  card_esploratore: { it: 'Esploratore', en: 'Explorer' },
  card_bilancioAnime: { it: 'Bilancio Anime', en: 'Anime Balance' },
  card_pomeriggio: { it: 'Pomeriggio', en: 'Afternoon' },
};

const currentLocale: Locale = getLocale();

export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = locales[key];
  if (!entry) return key;
  let text = entry[currentLocale] || entry['it'] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function setLocale(locale: Locale) {
  (process.env as any).LOCALE = locale;
}
