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

  // Build accent colour shades
  const accentLight = accent + '33';
  const accentBorder = accent + '55';

  const insightLogo = `<polygon points="-14,-22 14,-22 0,22" fill="#ffffff"/><polygon points="-7,-11 7,-11 0,11" fill="${accent}"/>`;

  // if imageUrl is set, use dark overlay; otherwise use gradient bg
  const bgLayer = imageUrl
    ? `<image href="${imageUrl}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>
<rect width="600" height="900" fill="url(#ol)"/>`
    : `<rect width="600" height="900" fill="${theme}"/>
<rect width="600" height="900" fill="url(#gg)"/>`;

  const overlayDef = imageUrl
    ? `<linearGradient id="ol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".05"/><stop offset="40%" stop-color="#000" stop-opacity=".5"/><stop offset="100%" stop-color="#000" stop-opacity=".95"/></linearGradient>`
    : `<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${accentLight}"/><stop offset="100%" stop-color="#0005"/></linearGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>${overlayDef}
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".6"/></filter>
  <filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${bgLayer}

  <!-- top bar -->
  <rect x="30" y="24" width="540" height="56" rx="28" fill="#000" opacity=".3"/>
  <rect x="30" y="24" width="540" height="56" rx="28" fill="none" stroke="${accentBorder}" stroke-width="1"/>
  <g transform="translate(44,34)"><g transform="translate(0,10)">${insightLogo}</g><text x="44" y="37" fill="#fff" font-size="20" font-weight="900" font-family="${ff}" letter-spacing="5">INSIGHT</text></g>
  ${statLabel ? `<g transform="translate(458,34)"><rect x="0" y="0" width="98" height="36" rx="18" fill="${accentLight}"/><text x="49" y="23" fill="${accent}" font-size="13" font-weight="800" font-family="${ff}" text-anchor="middle">${statLabel}</text></g>` : ''}

  <!-- stat -->
  ${hasStat ? `<rect x="60" y="270" width="480" height="360" rx="24" fill="#000" opacity=".4" filter="url(#s)"/>
<rect x="60" y="270" width="480" height="360" rx="24" fill="none" stroke="${accentBorder}" stroke-width="1"/>
<text x="300" y="${statValue.length > 6 ? 490 : 510}" fill="${accent}" font-size="${statValue.length > 6 ? 100 : 130}" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#g)" letter-spacing="-3">${statValue}</text>
${statLabel ? `<text x="300" y="575" fill="#fff" font-size="24" font-weight="800" font-family="${ff}" text-anchor="middle" letter-spacing="5">${statLabel}</text>` : ''}
<rect x="260" y="595" width="80" height="2" rx="1" fill="${accent}" opacity=".6"/>` : ''}

  <!-- title -->
  <text x="40" y="${hasStat ? 800 : 620}" fill="#fff" font-size="${title.length > 20 ? 26 : 32}" font-weight="900" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${truncate(title, 45)}</tspan></text>
  <text x="40" y="${hasStat ? 840 : 667}" fill="#94a3b8" font-size="17" font-weight="600" font-family="${ff}">${subtitle}</text>

  <!-- trakt -->
  <text x="560" y="878" fill="#ed1c24" font-size="12" font-weight="800" font-family="${ff}" text-anchor="end" opacity=".9">trakt</text>
</svg>`;
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

  const accentLight = accent + '33';
  const accentBorder = accent + '55';

  const insightLogo = `<polygon points="-14,-22 14,-22 0,22" fill="#ffffff"/><polygon points="-7,-11 7,-11 0,11" fill="${esc(accent)}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".6"/></filter>
  <filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect x="30" y="24" width="540" height="56" rx="28" fill="#000" opacity=".3"/>
  <rect x="30" y="24" width="540" height="56" rx="28" fill="none" stroke="${esc(accentBorder)}" stroke-width="1"/>
  <g transform="translate(44,34)"><g transform="translate(0,10)">${insightLogo}</g><text x="44" y="37" fill="#fff" font-size="20" font-weight="900" font-family="${ff}" letter-spacing="5">INSIGHT</text></g>
  ${statLabel ? `<g transform="translate(458,34)"><rect x="0" y="0" width="98" height="36" rx="18" fill="${esc(accentLight)}"/><text x="49" y="23" fill="${esc(accent)}" font-size="13" font-weight="800" font-family="${ff}" text-anchor="middle">${esc(statLabel)}</text></g>` : ''}

  ${hasStat ? `<rect x="60" y="270" width="480" height="360" rx="24" fill="#000" opacity=".4" filter="url(#s)"/>
<rect x="60" y="270" width="480" height="360" rx="24" fill="none" stroke="${esc(accentBorder)}" stroke-width="1"/>
<text x="300" y="${statValue.length > 6 ? 490 : 510}" fill="${esc(accent)}" font-size="${statValue.length > 6 ? 100 : 130}" font-weight="900" font-family="${ff}" text-anchor="middle" filter="url(#g)" letter-spacing="-3">${esc(statValue)}</text>
${statLabel ? `<text x="300" y="575" fill="#fff" font-size="24" font-weight="800" font-family="${ff}" text-anchor="middle" letter-spacing="5">${esc(statLabel)}</text>` : ''}
<rect x="260" y="595" width="80" height="2" rx="1" fill="${esc(accent)}" opacity=".6"/>` : ''}

  <text x="40" y="${hasStat ? 800 : 620}" fill="#fff" font-size="${title.length > 20 ? 26 : 32}" font-weight="900" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${esc(truncate(title, 45))}</tspan></text>
  <text x="40" y="${hasStat ? 840 : 667}" fill="#94a3b8" font-size="17" font-weight="600" font-family="${ff}">${esc(truncate(subtitle, SUBTITLE_MAX))}</text>

  <text x="560" y="878" fill="#ed1c24" font-size="12" font-weight="800" font-family="${ff}" text-anchor="end" opacity=".9">trakt</text>
</svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
