export function getManifest(uuid?: string, slug?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const idStr = slug || uuid;
  const isConfigured = !!uuid;

  return {
    id: idStr ? `community.stremio.adaptive.insights.${idStr}` : 'community.stremio.adaptive.insights',
    version: '3.3.0',
    name: `Adaptive Insights${slug ? ` (${slug})` : ''}`,
    description: 'Statistiche personali Trakt nella home di Stremio. 32 card dinamiche: streak, binge, generi, attori, anime e molto altro.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: ['movie'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !isConfigured,
      configurationUrl: slug ? `/configure/${slug}` : '/configure/'
    },
    idPrefixes: ['adaptive_'],
    catalogs: [
      {
        type: 'movie',
        id: 'adaptive-insights',
        name: isConfigured ? 'Adaptive Insights' : 'Adaptive Insights (configura)',
        extra: [],
        behaviorHints: {
          defaultVideoId: null
        }
      }
    ]
  };
}
