export function getManifest(configId?: string) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return {
    id: configId ? `community.stremio.adaptive.insights.${configId}` : 'community.stremio.adaptive.insights',
    version: '3.0.0',
    name: 'Adaptive Insights',
    description: 'Una riga dinamica di card personalizzate, stagionali e apribili come episodi.',
    logo: `${baseUrl}/logo.png`,
    resources: ['catalog', 'meta'],
    types: ['series'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !configId
    },
    idPrefixes: ['adaptive_'],
    catalogs: configId ? [
      { type: 'series', id: 'adaptive-insights', name: 'Your Adaptive Insights' }
    ] : []
  };
}
