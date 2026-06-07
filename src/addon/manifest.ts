export function getManifest(uuid?: string, slug?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const idStr = slug || uuid;

  return {
    id: idStr ? `community.stremio.adaptive.insights.${idStr}` : 'community.stremio.adaptive.insights',
    version: '3.2.0',
    name: `Adaptive Insights${slug ? ` (${slug})` : ''}`,
    description: 'Statistiche personali Trakt direttamente nella home di Stremio.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: ['movie'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !uuid,
      configurationUrl: slug ? `/configure/${slug}` : '/configure/'
    },
    idPrefixes: ['adaptive_'],
    catalogs: uuid
      ? [
          {
            type: 'movie',
            id: 'adaptive-insights',
            name: '✨ Adaptive Insights',
            behaviorHints: {
              defaultVideoId: null
            }
          }
        ]
      : []
  };
}
