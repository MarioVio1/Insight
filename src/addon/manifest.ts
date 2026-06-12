import { t } from '../services/locale.js';

export const INSIGHT_TYPE = 'movie';
export const INSIGHT_CATALOG_ID = 'insight-stats';
export const LEGACY_INSIGHT_CATALOG_ID = 'adaptive-insights';
export const DISCOVER_CATALOG_ID = 'insight-discover';

export function getManifest(uuid?: string, slug?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const idStr = slug || uuid;
  const isConfigured = !!uuid;
  const version = isConfigured ? t('manifestName') + (slug ? ` (${slug})` : '') : t('manifestName');

  return {
    id: idStr ? `community.stremio.adaptive.insights.${idStr}` : 'community.stremio.adaptive.insights',
    version: '3.5.0',
    name: `Adaptive Insights${slug ? ` (${slug})` : ''}`,
    description: t('manifestDescription'),
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta', 'subtitles'],
    types: [INSIGHT_TYPE],
    behaviorHints: {
      configurable: true,
      configurationRequired: !isConfigured,
      configurationUrl: slug ? `/configure/${slug}` : '/configure/'
    },
    idPrefixes: ['adaptive_', 'discover_'],
    catalogs: [
      {
        type: INSIGHT_TYPE,
        id: INSIGHT_CATALOG_ID,
        name: isConfigured ? t('catalogName') : t('catalogSetup'),
        extra: [],
        behaviorHints: {
          defaultVideoId: null
        }
      },
      ...(isConfigured ? [{
        type: INSIGHT_TYPE,
        id: DISCOVER_CATALOG_ID,
        name: 'Per te',
        extra: [{ name: 'skip', isRequired: false }],
        behaviorHints: {
          defaultVideoId: null
        }
      }] : [])
    ]
  };
}
