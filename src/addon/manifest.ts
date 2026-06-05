export function getManifest(configId?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return {
    id: configId ? `community.stremio.adaptive.insights.${configId}` : 'community.stremio.adaptive.insights',
    version: '3.2.0',
    name: 'Adaptive Insights',
    description: 'Statistiche personali vive, stagionali e apribili come episodi.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !configId
    },
    idPrefixes: ['adaptive_'],
    catalogs: configId
      ? [
          {
            type: 'movie',
            id: 'adaptive-insights',
            name: '✨ Your Adaptive Insights',
            behaviorHints: {
              defaultVideoId: null
            }
          },
          {
            type: 'series',
            id: 'adaptive-insights-series',
            name: 'Your Adaptive Insights (Series)'
          }
        ]
      : []
  };
}
