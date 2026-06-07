export function generateSvgPoster(opts: { title: string; subtitle: string; accent?: string; theme?: string; statValue?: string; statLabel?: string; imageUrl?: string }) {
  const accent = opts.accent || '#0ea5e9';
  const theme = opts.theme || '#0f172a';
  const title = escapeXml(opts.title || '');
  const subtitle = escapeXml(opts.subtitle || '');
  const statValue = opts.statValue ? escapeXml(opts.statValue) : '';
  const statLabel = opts.statLabel ? escapeXml(opts.statLabel) : '';
  const imageUrl = opts.imageUrl || '';
  const ff = 'system-ui, -apple-system, sans-serif';
  const hasStat = !!statValue;
  const titleY = hasStat ? 640 : 500;
  const subtitleY = hasStat ? 690 : 550;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme}" />
        <stop offset="55%" stop-color="${accent}22" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="glow1" cx="80%" cy="10%" r="60%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="glow2" cx="20%" cy="90%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      ${imageUrl ? `
      <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.1" />
        <stop offset="50%" stop-color="#000" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
      </linearGradient>` : ''}
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.7"/>
      </filter>
    </defs>
    ${imageUrl ? `
    <image href="${imageUrl}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <rect width="600" height="900" fill="url(#overlay)"/>` : `
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#glow1)"/>
    <rect width="600" height="900" fill="url(#glow2)"/>`}
    <rect x="20" y="20" width="560" height="860" rx="36" fill="none" stroke="#ffffff18" stroke-width="1.5"/>
    <rect x="32" y="32" width="536" height="6" rx="3" fill="${accent}" opacity="0.7"/>
    <text x="48" y="90" fill="${accent}" font-size="16" font-weight="700" font-family="${ff}" letter-spacing="3" filter="url(#shadow)">INSIGHT</text>
    <line x1="48" y1="104" x2="140" y2="104" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
    ${hasStat ? `
    <text x="48" y="460" fill="#ffffff" font-size="72" font-weight="900" font-family="${ff}" filter="url(#shadow)">${statValue}</text>
    ${statLabel ? `<text x="48" y="500" fill="${accent}" font-size="20" font-weight="600" font-family="${ff}" letter-spacing="1" filter="url(#shadow)">${statLabel}</text>` : ''}` : ''}
    <text x="48" y="${titleY}" fill="#ffffff" font-size="32" font-weight="800" font-family="${ff}" filter="url(#shadow)">${title}</text>
    <text x="48" y="${subtitleY}" fill="#94a3b8" font-size="18" font-weight="400" font-family="${ff}" filter="url(#shadow)">${subtitle}</text>
    <rect x="48" y="810" width="504" height="2" rx="1" fill="${accent}" opacity="0.25"/>
    <text x="48" y="845" fill="#475569" font-size="13" font-family="${ff}" letter-spacing="1" filter="url(#shadow)">TRACKT STATS &middot; ${new Date().toLocaleDateString('it-IT')}</text>
  </svg>`;
  return svg;
}

export function generateBackgroundSvg(accent: string, theme = '#0f172a') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme}" />
        <stop offset="55%" stop-color="${accent}22" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="g1" cx="80%" cy="10%" r="60%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="g2" cx="20%" cy="90%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#g1)"/>
    <rect width="600" height="900" fill="url(#g2)"/>
  </svg>`;
}

export function generateOverlaySvg(opts: {
  title: string;
  subtitle: string;
  accent: string;
  statValue: string;
  statLabel: string;
}) {
  const { title, subtitle, accent, statValue, statLabel } = opts;
  const ff = 'system-ui, -apple-system, sans-serif';
  const hasStat = !!statValue;
  const titleY = hasStat ? 640 : 500;
  const subtitleY = hasStat ? 690 : 550;
  const esc = escapeXml;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <rect x="20" y="20" width="560" height="860" rx="36" fill="none" stroke="#ffffff18" stroke-width="1.5"/>
    <rect x="32" y="32" width="536" height="6" rx="3" fill="${esc(accent)}" opacity="0.7"/>
    <text x="48" y="90" fill="${esc(accent)}" font-size="16" font-weight="700" font-family="${ff}" letter-spacing="3">INSIGHT</text>
    <line x1="48" y1="104" x2="140" y2="104" stroke="${esc(accent)}" stroke-width="2.5" opacity="0.6"/>
    ${hasStat ? `
    <text x="48" y="460" fill="#ffffff" font-size="72" font-weight="900" font-family="${ff}">${esc(statValue)}</text>
    ${statLabel ? `<text x="48" y="500" fill="${esc(accent)}" font-size="20" font-weight="600" font-family="${ff}" letter-spacing="1">${esc(statLabel)}</text>` : ''}` : ''}
    <text x="48" y="${titleY}" fill="#ffffff" font-size="32" font-weight="800" font-family="${ff}">${esc(title)}</text>
    <text x="48" y="${subtitleY}" fill="#94a3b8" font-size="18" font-weight="400" font-family="${ff}">${esc(subtitle)}</text>
    <rect x="48" y="810" width="504" height="2" rx="1" fill="${esc(accent)}" opacity="0.25"/>
    <text x="48" y="845" fill="#475569" font-size="13" font-family="${ff}" letter-spacing="1">TRACKT STATS · ${new Date().toLocaleDateString('it-IT')}</text>
  </svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
