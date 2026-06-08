const FONT_FAMILY = "'Noto Sans', 'Noto Sans CJK JP', 'DejaVu Sans', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif";
const SUBTITLE_MAX = 80;

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function generateSvgPoster(opts: { title: string; subtitle: string; accent?: string; theme?: string; statValue?: string; statLabel?: string; imageUrl?: string }) {
  const accent = opts.accent || '#0ea5e9';
  const theme = opts.theme || '#0f172a';
  const title = escapeXml(opts.title || '');
  let subtitle = escapeXml(opts.subtitle || '');
  subtitle = subtitle.replace(/\b0\.\d+\s+/g, '');
  subtitle = truncate(subtitle, SUBTITLE_MAX);
  const statValue = opts.statValue ? escapeXml(opts.statValue) : '';
  const statLabel = opts.statLabel ? escapeXml(opts.statLabel) : '';
  const imageUrl = opts.imageUrl || '';
  const ff = FONT_FAMILY;
  const hasStat = !!statValue;

  // Logo Insight (triangolo play)
  const insightLogo = `<polygon points="-18,-30 18,-30 0,30" fill="#ffffff" opacity="0.95"/><polygon points="-9,-15 9,-15 0,15" fill="${accent}"/>`;

  // Logo Trakt semplificato (icona cuore rosso + testo)
  const traktBadge = `<g transform="translate(570,870)">
    <text x="0" y="0" fill="#ed1c24" font-size="11" font-weight="600" font-family="${ff}" text-anchor="end">trakt</text>
    <rect x="-28" y="-4" width="9" height="9" rx="2" fill="#ed1c24"/>
  </g>`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme}" />
        <stop offset="50%" stop-color="${accent}22" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="glow1" cx="75%" cy="15%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.30" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="glow2" cx="25%" cy="85%" r="45%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.15" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="boxGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff08" />
        <stop offset="100%" stop-color="#00000060" />
      </linearGradient>
      ${imageUrl ? `
      <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.05" />
        <stop offset="45%" stop-color="#000" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
      </linearGradient>` : ''}
      <filter id="shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
      </filter>
      <filter id="glowAccent">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    ${imageUrl ? `
    <image href="${imageUrl}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <rect width="600" height="900" fill="url(#overlay)"/>` : `
    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#glow1)"/>
    <rect width="600" height="900" fill="url(#glow2)"/>`}

    <!-- Top branding bar -->
    <rect x="0" y="0" width="600" height="72" fill="url(#boxGrad)"/>
    <rect x="0" y="72" width="600" height="1" fill="${accent}" opacity="0.3"/>
    <g transform="translate(20,22)">
      <g transform="translate(0,14)">${insightLogo}</g>
      <text x="34" y="32" fill="${accent}" font-size="18" font-weight="800" font-family="${ff}" letter-spacing="4" filter="url(#softGlow)">INSIGHT</text>
    </g>
    ${statLabel ? `<rect x="390" y="20" height="32" rx="16" fill="${accent}" opacity="0.15"/>
    <text x="404" y="40" fill="${accent}" font-size="12" font-weight="700" font-family="${ff}" letter-spacing="1">${statLabel}</text>` : ''}

    <!-- Main stat section -->
    ${hasStat ? `
    <rect x="60" y="280" width="480" height="370" rx="24" fill="#000000" opacity="0.45" filter="url(#shadow)"/>
    <rect x="60" y="280" width="480" height="370" rx="24" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>
    <rect x="64" y="284" width="472" height="362" rx="22" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.08"/>
    
    <!-- Large stat value -->
    <text x="300" y="505" fill="${accent}" font-size="110" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#glowAccent)" letter-spacing="-3">${statValue}</text>
    
    <!-- Stat label below value -->
    ${statLabel ? `<text x="300" y="565" fill="#ffffff" font-size="20" font-weight="700" font-family="${ff}" text-anchor="middle" filter="url(#shadow)" letter-spacing="3">${statLabel}</text>` : ''}
    
    <!-- Decorative divider -->
    <rect x="250" y="585" width="100" height="2" rx="1" fill="${accent}" opacity="0.6"/>
    ` : ''}

    <!-- Card title (prominent on cover) -->
    <text x="48" y="${hasStat ? 790 : 640}" fill="#ffffff" font-size="${title.length > 25 ? 22 : 26}" font-weight="800" font-family="${ff}" filter="url(#shadow)">
      <tspan x="48" dy="0">${truncate(title, 50)}</tspan>
    </text>
    
    <!-- Subtitle -->
    <text x="48" y="${hasStat ? 830 : 685}" fill="#94a3b8" font-size="15" font-weight="400" font-family="${ff}" filter="url(#shadow)">${subtitle}</text>
    
    <!-- Bottom Trakt attribution -->
    ${traktBadge}
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
  const ff = FONT_FAMILY;
  const hasStat = !!statValue;
  const esc = escapeXml;

  const insightLogo = `<polygon points="-18,-30 18,-30 0,30" fill="#ffffff" opacity="0.95"/><polygon points="-9,-15 9,-15 0,15" fill="${esc(accent)}"/>`;

  const traktBadge = `<g transform="translate(570,870)">
    <text x="0" y="0" fill="#ed1c24" font-size="11" font-weight="600" font-family="${ff}" text-anchor="end">trakt</text>
    <rect x="-28" y="-4" width="9" height="9" rx="2" fill="#ed1c24"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
      </filter>
      <filter id="glowAccent">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="boxGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff08" />
        <stop offset="100%" stop-color="#00000060" />
      </linearGradient>
    </defs>
    
    <!-- Top branding bar -->
    <rect x="0" y="0" width="600" height="72" fill="url(#boxGrad)"/>
    <rect x="0" y="72" width="600" height="1" fill="${esc(accent)}" opacity="0.3"/>
    <g transform="translate(20,22)">
      <g transform="translate(0,14)">${insightLogo}</g>
      <text x="34" y="32" fill="${esc(accent)}" font-size="18" font-weight="800" font-family="${ff}" letter-spacing="4" filter="url(#softGlow)">INSIGHT</text>
    </g>
    ${statLabel ? `<rect x="390" y="20" height="32" rx="16" fill="${esc(accent)}" opacity="0.15"/>
    <text x="404" y="40" fill="${esc(accent)}" font-size="12" font-weight="700" font-family="${ff}" letter-spacing="1">${esc(statLabel)}</text>` : ''}

    ${hasStat ? `
    <rect x="60" y="280" width="480" height="370" rx="24" fill="#000000" opacity="0.45" filter="url(#shadow)"/>
    <rect x="60" y="280" width="480" height="370" rx="24" fill="none" stroke="${esc(accent)}" stroke-width="1.5" opacity="0.5"/>
    
    <text x="300" y="505" fill="${esc(accent)}" font-size="110" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#glowAccent)" letter-spacing="-3">${esc(statValue)}</text>
    ${statLabel ? `<text x="300" y="565" fill="#ffffff" font-size="20" font-weight="700" font-family="${ff}" text-anchor="middle" filter="url(#shadow)" letter-spacing="3">${esc(statLabel)}</text>` : ''}
    <rect x="250" y="585" width="100" height="2" rx="1" fill="${esc(accent)}" opacity="0.6"/>
    ` : ''}

    <text x="48" y="${hasStat ? 790 : 640}" fill="#ffffff" font-size="${title.length > 25 ? 22 : 26}" font-weight="800" font-family="${ff}" filter="url(#shadow)">
      <tspan x="48" dy="0">${esc(truncate(title, 50))}</tspan>
    </text>
    <text x="48" y="${hasStat ? 830 : 685}" fill="#94a3b8" font-size="15" font-weight="400" font-family="${ff}" filter="url(#shadow)">${esc(truncate(subtitle, SUBTITLE_MAX))}</text>
    
    ${traktBadge}
  </svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
