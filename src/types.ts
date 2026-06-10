export interface TraktHistoryIds {
  trakt: number;
  tmdb: number | null;
  imdb?: string | null;
}

export interface TraktMovie {
  title: string;
  year: number;
  ids: TraktHistoryIds;
  runtime: number;
  genres: string[];
}

export interface TraktShow {
  title: string;
  year: number;
  ids: TraktHistoryIds;
  genres: string[];
}

export interface TraktEpisode {
  title: string;
  season: number;
  number: number;
  ids: { trakt: number; tmdb: number | null };
  runtime: number;
}

export interface TraktHistoryPayload {
  watched_at: string;
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
}

export interface TraktEvent {
  id: string;
  config_id: string;
  trakt_id: string;
  trakt_type: 'movie' | 'show';
  title: string;
  year: number | null;
  watched_at: string;
  runtime_minutes: number | null;
  genres: string[] | null;
  tmdb_id: number | null;
  payload: TraktHistoryPayload;
}

export interface InsightSummary {
  totalHours: number;
  totalMovies: number;
  totalEpisodes: number;
  streak: number;
  peakHour: { hour: number; count: number } | null;
  weekdayPattern: { day: number; count: number }[];
  genre_counts: { genre: string; count: number }[];
  topGenre: string | null;
  avgRating: number;
  bingeSessions: { title: string; episodes: number; date: string; tmdb_id: number | null }[];
  droppedShows: { title: string; lastDate: string; totalEpisodes: number; tmdb_id: number | null }[];
  primeTimePct: number;
  splitMovieSeries: { moviePct: number; seriesPct: number };
  movieAvg: number;
  seriesAvg: number;
  totalDays: number;
  avgPerDay: number;
  bestYear: string | null;
  bestYearCount: number;
  currentYearProgress: number;
  longestBreak: number;
  avgRuntime: number;
  deepNightPct: number;
  uniqueShows: number;
  vintagePct: number;
  completionRate: number;
  animeCount: number;
  animeHours: number;
  animeStreak: number;
  animePeakHour: { hour: number; count: number } | null;
  animePct: number;
  animeUniqueTitles: number;
  animeTotalDays: number;
  animeAvgPerDay: number;
  topActor: string | null;
  topDirector: string | null;
  topWriter: string | null;
  bestMonth: string | null;
  bestMonthCount: number;
  bestDay: string;
  bestDayCount: number;
  memories: any[];
  seriesRewatch: any[];
  animeRewatch: any[];
  animeTmdbIds: number[];
}
