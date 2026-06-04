export function toManifest(baseUrl: string) {
  return {
    id: 'community.stremio.trakt.addon',
    version: '1.0.0',
    name: 'Trakt Cloud Addon',
    description: 'Personal Trakt catalogs synced from a cloud backend.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [
      { type: 'movie', id: 'watchlist-movies', name: 'Trakt Watchlist Movies' },
      { type: 'series', id: 'watchlist-series', name: 'Trakt Watchlist Series' },
      { type: 'movie', id: 'history-movies', name: 'Trakt History Movies' },
      { type: 'series', id: 'history-series', name: 'Trakt History Series' }
    ],
    idPrefixes: ['tt']
  };
}
