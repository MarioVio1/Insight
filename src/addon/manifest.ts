export function getManifest() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return {
    id: 'community.stremio.trakt.insights',
    version: '2.0.0',
    name: 'Trakt Insights Cloud',
    description: 'Statistiche, ricorrenze, profili e insight personali da Trakt dentro Stremio.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: ['movie'],
    idPrefixes: ['stats_', 'profile_', 'rewatch_', 'genre_', 'person_', 'recurring_'],
    catalogs: [
      { type: 'movie', id: 'stats-overview', name: 'Stats Overview' },
      { type: 'movie', id: 'this-month', name: 'This Month' },
      { type: 'movie', id: 'recurring-habits', name: 'Ricorrenze' },
      { type: 'movie', id: 'top-genres', name: 'Top Genres' },
      { type: 'movie', id: 'top-people', name: 'Top People' },
      { type: 'movie', id: 'rewatch-insights', name: 'Rewatch Insights' },
      { type: 'movie', id: 'profiles', name: 'Profiles' }
    ]
  };
}
