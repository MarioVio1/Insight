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

  const insightLogo = `<polygon points="-24,-36 24,-36 0,36" fill="#ffffff" opacity="0.95"/><polygon points="-12,-18 12,-18 0,18" fill="${accent}"/>`;

  const traktBadge = `<g transform="translate(570,878)">
    <text x="0" y="0" fill="#ed1c24" font-size="13" font-weight="800" font-family="${ff}" text-anchor="end">trakt</text>
    <rect x="-32" y="-5" width="11" height="11" rx="3" fill="#ed1c24"/>
  </g>`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme}" />
        <stop offset="45%" stop-color="${accent}22" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="glow1" cx="70%" cy="10%" r="60%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="glow2" cx="30%" cy="90%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.15" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      ${imageUrl ? `
      <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.05" />
        <stop offset="40%" stop-color="#000" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
      </linearGradient>` : ''}
      <filter id="shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.7"/>
      </filter>
      <filter id="glowBig">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glowSmall">
        <feGaussianBlur stdDeviation="2" result="blur"/>
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

    <!-- Top bar: logo + INSIGHT -->
    <rect x="36" y="28" width="528" height="64" rx="32" fill="#000000" opacity="0.35" filter="url(#shadow)"/>
    <rect x="36" y="28" width="528" height="64" rx="32" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.4"/>
    <g transform="translate(52,38)">
      <g transform="translate(0,12)">${insightLogo}</g>
      <text x="52" y="44" fill="#ffffff" font-size="22" font-weight="900" font-family="${ff}" letter-spacing="6" filter="url(#glowSmall)">INSIGHT</text>
    </g>
    ${statLabel ? `<rect x="420" y="38" height="44" rx="22" fill="${accent}" opacity="0.2"/>
    <rect x="420" y="38" height="44" rx="22" fill="none" stroke="${accent}" stroke-width="1" opacity="0.5"/>
    <text x="442" y="66" fill="${accent}" font-size="15" font-weight="800" font-family="${ff}" letter-spacing="2">${statLabel}</text>` : ''}

    <!-- Main stat - massive -->
    ${hasStat ? `
    <rect x="70" y="250" width="460" height="380" rx="28" fill="#000000" opacity="0.5" filter="url(#shadow)"/>
    <rect x="70" y="250" width="460" height="380" rx="28" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.4"/>
    
    <text x="300" y="500" fill="${accent}" font-size="${statValue.length > 6 ? 100 : 140}" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#glowBig)" letter-spacing="-4">${statValue}</text>
    
    ${statLabel ? `<text x="300" y="565" fill="#ffffff" font-size="26" font-weight="800" font-family="${ff}" text-anchor="middle" filter="url(#shadow)" letter-spacing="4">${statLabel}</text>` : ''}
    
    <rect x="260" y="590" width="80" height="3" rx="1.5" fill="${accent}" opacity="0.7"/>
    ` : ''}

    <!-- Title - big and bold -->
    <text x="48" y="${hasStat ? 800 : 640}" fill="#ffffff" font-size="${title.length > 20 ? 28 : 34}" font-weight="900" font-family="${ff}" filter="url(#shadow)">
      <tspan x="48" dy="0">${truncate(title, 45)}</tspan>
    </text>
    
    <!-- Subtitle -->
    <text x="48" y="${hasStat ? 845 : 690}" fill="#94a3b8" font-size="18" font-weight="600" font-family="${ff}" opacity="0.9">${subtitle}</text>
    
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

  const insightLogo = `<polygon points="-24,-36 24,-36 0,36" fill="#ffffff" opacity="0.95"/><polygon points="-12,-18 12,-18 0,18" fill="${esc(accent)}"/>`;

  const traktBadge = `<g transform="translate(570,878)">
    <text x="0" y="0" fill="#ed1c24" font-size="13" font-weight="800" font-family="${ff}" text-anchor="end">trakt</text>
    <rect x="-32" y="-5" width="11" height="11" rx="3" fill="#ed1c24"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.7"/>
      </filter>
      <filter id="glowBig">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glowSmall">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Top bar -->
    <rect x="36" y="28" width="528" height="64" rx="32" fill="#000000" opacity="0.35" filter="url(#shadow)"/>
    <rect x="36" y="28" width="528" height="64" rx="32" fill="none" stroke="${esc(accent)}" stroke-width="1.5" opacity="0.4"/>
    <g transform="translate(52,38)">
      <g transform="translate(0,12)">${insightLogo}</g>
      <text x="52" y="44" fill="#ffffff" font-size="22" font-weight="900" font-family="${ff}" letter-spacing="6" filter="url(#glowSmall)">INSIGHT</text>
    </g>
    ${statLabel ? `<rect x="420" y="38" height="44" rx="22" fill="${esc(accent)}" opacity="0.2"/>
    <rect x="420" y="38" height="44" rx="22" fill="none" stroke="${esc(accent)}" stroke-width="1" opacity="0.5"/>
    <text x="442" y="66" fill="${esc(accent)}" font-size="15" font-weight="800" font-family="${ff}" letter-spacing="2">${esc(statLabel)}</text>` : ''}

    ${hasStat ? `
    <rect x="70" y="250" width="460" height="380" rx="28" fill="#000000" opacity="0.5" filter="url(#shadow)"/>
    <rect x="70" y="250" width="460" height="380" rx="28" fill="none" stroke="${esc(accent)}" stroke-width="1.5" opacity="0.4"/>
    
    <text x="300" y="500" fill="${esc(accent)}" font-size="${statValue.length > 6 ? 100 : 140}" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#glowBig)" letter-spacing="-4">${esc(statValue)}</text>
    ${statLabel ? `<text x="300" y="565" fill="#ffffff" font-size="26" font-weight="800" font-family="${ff}" text-anchor="middle" filter="url(#shadow)" letter-spacing="4">${esc(statLabel)}</text>` : ''}
    <rect x="260" y="590" width="80" height="3" rx="1.5" fill="${esc(accent)}" opacity="0.7"/>
    ` : ''}

    <text x="48" y="${hasStat ? 800 : 640}" fill="#ffffff" font-size="${title.length > 20 ? 28 : 34}" font-weight="900" font-family="${ff}" filter="url(#shadow)">
      <tspan x="48" dy="0">${esc(truncate(title, 45))}</tspan>
    </text>
    <text x="48" y="${hasStat ? 845 : 690}" fill="#94a3b8" font-size="18" font-weight="600" font-family="${ff}" opacity="0.9">${esc(truncate(subtitle, SUBTITLE_MAX))}</text>
    
    ${traktBadge}
  </svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
