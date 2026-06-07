import sharp from 'sharp';

export function generateSvgPoster(opts: { title: string; subtitle: string; accent?: string; theme?: string; statValue?: string; statLabel?: string }) {
  const accent = opts.accent || '#0ea5e9';
  const theme = opts.theme || '#0f172a';
  const title = escapeXml(opts.title);
  const subtitle = escapeXml(opts.subtitle);
  const statValue = opts.statValue ? escapeXml(opts.statValue) : '';
  const statLabel = opts.statLabel ? escapeXml(opts.statLabel) : '';
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
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${accent}" flood-opacity="0.25"/>
      </filter>
      <filter id="glowFilter">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#glow1)"/>
    <rect width="600" height="900" fill="url(#glow2)"/>
    <rect x="20" y="20" width="560" height="860" rx="36" fill="url(#shine)" stroke="#ffffff18" stroke-width="1.5"/>
    <rect x="32" y="32" width="536" height="6" rx="3" fill="${accent}" opacity="0.7"/>
    <text x="48" y="90" fill="${accent}" font-size="16" font-weight="700" font-family="Arial, sans-serif" letter-spacing="3">INSIGHT</text>
    <line x1="48" y1="104" x2="140" y2="104" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
    ${statValue ? `
    <text x="48" y="500" fill="#ffffff" font-size="96" font-weight="900" font-family="Arial, sans-serif" filter="url(#shadow)">${statValue}</text>
    ${statLabel ? `<text x="48" y="540" fill="${accent}" font-size="20" font-weight="600" font-family="Arial, sans-serif" letter-spacing="1">${statLabel}</text>` : ''}
    ` : ''}
    <text x="48" y="680" fill="#ffffff" font-size="38" font-weight="800" font-family="Arial, sans-serif" filter="url(#shadow)">${title}</text>
    <text x="48" y="730" fill="#94a3b8" font-size="18" font-weight="400" font-family="Arial, sans-serif">${subtitle}</text>
    <rect x="48" y="810" width="504" height="2" rx="1" fill="${accent}" opacity="0.25"/>
    <text x="48" y="845" fill="#475569" font-size="13" font-family="Arial, sans-serif" letter-spacing="1">TRACKT STATS · ${new Date().toLocaleDateString('it-IT')}</text>
  </svg>`;
  return svg;
}

export async function generatePngPoster(opts: { title: string; subtitle: string; accent?: string; theme?: string; statValue?: string; statLabel?: string }): Promise<Buffer> {
  const svg = generateSvgPoster(opts);
  return sharp(Buffer.from(svg)).png({ force: true }).toBuffer();
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
