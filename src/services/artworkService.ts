const FONT_FAMILY = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SUBTITLE_MAX = 90;

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

  const accentLight = accent + '22';
  const accentBorder = accent + '44';

  const insightLogo = `<polygon points="-12,-18 12,-18 0,18" fill="#ffffff"/><polygon points="-6,-9 6,-9 0,9" fill="${accent}"/>`;

  const bgLayer = imageUrl
    ? `<image href="${imageUrl}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>
<rect width="600" height="900" fill="url(#ol)"/>`
    : `<rect width="600" height="900" fill="${theme}"/>
<rect width="600" height="900" fill="url(#gg)"/>`;

  const overlayDef = imageUrl
    ? `<linearGradient id="ol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".05"/><stop offset="30%" stop-color="#000" stop-opacity=".4"/><stop offset="100%" stop-color="#000" stop-opacity=".92"/></linearGradient>`
    : `<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${accentLight}"/><stop offset="100%" stop-color="#0005"/></linearGradient>`;

  const valFontSize = statValue.length > 8 ? 56 : statValue.length > 5 ? 68 : 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>${overlayDef}
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  ${bgLayer}

  <rect x="24" y="20" width="552" height="48" rx="24" fill="#000" opacity=".25"/>
  <rect x="24" y="20" width="552" height="48" rx="24" fill="none" stroke="${accentBorder}" stroke-width="1"/>
  <g transform="translate(36,28)"><g transform="translate(0,6)">${insightLogo}</g><text x="38" y="31" fill="#fff" font-size="16" font-weight="800" font-family="${ff}" letter-spacing="4">INSIGHT</text></g>
  ${statLabel ? `<g transform="translate(462,28)"><rect x="0" y="0" width="90" height="32" rx="16" fill="${accentLight}"/><text x="45" y="20" fill="${accent}" font-size="12" font-weight="700" font-family="${ff}" text-anchor="middle">${statLabel}</text></g>` : ''}

  ${hasStat ? `<text x="40" y="310" fill="${accent}" font-size="${valFontSize}" font-weight="900" font-family="${ff}" filter="url(#s)" letter-spacing="-2">${statValue}</text>
<text x="40" y="345" fill="rgba(255,255,255,.5)" font-size="13" font-weight="500" font-family="${ff}">${statLabel}</text>` : ''}

  <text x="40" y="${hasStat ? 720 : 540}" fill="#fff" font-size="${title.length > 22 ? 24 : 28}" font-weight="700" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${truncate(title, 42)}</tspan></text>
  <text x="40" y="${hasStat ? 760 : 582}" fill="#94a3b8" font-size="16" font-weight="500" font-family="${ff}" line-height="1.4"><tspan x="40" dy="0">${subtitle}</tspan></text>

  <text x="560" y="878" fill="#ed1c24" font-size="11" font-weight="700" font-family="${ff}" text-anchor="end" opacity=".8">trakt</text>
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

  const accentLight = accent + '22';
  const accentBorder = accent + '44';

  const insightLogo = `<polygon points="-12,-18 12,-18 0,18" fill="#ffffff"/><polygon points="-6,-9 6,-9 0,9" fill="${esc(accent)}"/>`;

  const valFontSize = statValue.length > 8 ? 56 : statValue.length > 5 ? 68 : 80;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>

  <rect x="24" y="20" width="552" height="48" rx="24" fill="#000" opacity=".25"/>
  <rect x="24" y="20" width="552" height="48" rx="24" fill="none" stroke="${esc(accentBorder)}" stroke-width="1"/>
  <g transform="translate(36,28)"><g transform="translate(0,6)">${insightLogo}</g><text x="38" y="31" fill="#fff" font-size="16" font-weight="800" font-family="${ff}" letter-spacing="4">INSIGHT</text></g>
  ${statLabel ? `<g transform="translate(462,28)"><rect x="0" y="0" width="90" height="32" rx="16" fill="${esc(accentLight)}"/><text x="45" y="20" fill="${esc(accent)}" font-size="12" font-weight="700" font-family="${ff}" text-anchor="middle">${esc(statLabel)}</text></g>` : ''}

  ${hasStat ? `<text x="40" y="310" fill="${esc(accent)}" font-size="${valFontSize}" font-weight="900" font-family="${ff}" filter="url(#s)" letter-spacing="-2">${esc(statValue)}</text>
<text x="40" y="345" fill="rgba(255,255,255,.5)" font-size="13" font-weight="500" font-family="${ff}">${esc(statLabel)}</text>` : ''}

  <text x="40" y="${hasStat ? 720 : 540}" fill="#fff" font-size="${title.length > 22 ? 24 : 28}" font-weight="700" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${esc(truncate(title, 42))}</tspan></text>
  <text x="40" y="${hasStat ? 760 : 582}" fill="#94a3b8" font-size="16" font-weight="500" font-family="${ff}" line-height="1.4"><tspan x="40" dy="0">${esc(truncate(subtitle, SUBTITLE_MAX))}</tspan></text>

  <text x="560" y="878" fill="#ed1c24" font-size="11" font-weight="700" font-family="${ff}" text-anchor="end" opacity=".8">trakt</text>
</svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
