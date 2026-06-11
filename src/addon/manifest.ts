export const INSIGHT_TYPE = 'insight';
export const INSIGHT_CATALOG_ID = 'insight-stats';
export const LEGACY_INSIGHT_CATALOG_ID = 'adaptive-insights';

export function getManifest(uuid?: string, slug?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const idStr = slug || uuid;
  const isConfigured = !!uuid;

  return {
    id: idStr ? `community.stremio.adaptive.insights.${idStr}` : 'community.stremio.adaptive.insights',
    version: '3.4.0',
    name: `Adaptive Insights${slug ? ` (${slug})` : ''}`,
    description: 'Statistiche personali Trakt nella home di Stremio. 36 card dinamiche: streak, binge, generi, attori, anime e molto altro.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: [INSIGHT_TYPE],
    behaviorHints: {
      configurable: true,
      configurationRequired: !isConfigured,
      configurationUrl: slug ? `/configure/${slug}` : '/configure/'
    },
    idPrefixes: ['adaptive_'],
    catalogs: [
      {
        type: INSIGHT_TYPE,
        id: INSIGHT_CATALOG_ID,
        name: isConfigured ? 'Insight' : 'Insight (configura)',
        extra: [],
        behaviorHints: {
          defaultVideoId: null
        }
      }
    ]
  };
}
