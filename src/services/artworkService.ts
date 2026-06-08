const FONT_FAMILY = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SUBTITLE_MAX = 100;

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  if (words.length <= 1) return [text];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildStatSvg(statValue: string, statLabel: string, accent: string, ff: string): string {
  const words = statValue.split(' ');
  if (words.length <= 1) {
    const fs = statValue.length > 8 ? 56 : statValue.length > 5 ? 68 : 80;
    return `<text x="40" y="310" fill="${accent}" font-size="${fs}" font-weight="900" font-family="${ff}" filter="url(#s)" letter-spacing="-2">${statValue}</text>
<text x="40" y="345" fill="rgba(255,255,255,.5)" font-size="13" font-weight="500" font-family="${ff}">${statLabel}</text>`;
  }
  const maxChars = Math.max(10, Math.min(18, Math.floor(520 / (words.length > 3 ? 22 : 26))));
  const lines = wrapText(statValue, maxChars);
  const lineH = lines.length > 3 ? 38 : 44;
  const fs = lines.length > 3 ? 28 : lines.length > 2 ? 34 : 40;
  const startY = 280;
  const tspans = lines.map((line, i) => `<tspan x="40" dy="${i === 0 ? 0 : lineH}">${line}</tspan>`).join('');
  return `<text x="40" y="${startY}" fill="${accent}" font-size="${fs}" font-weight="900" font-family="${ff}" filter="url(#s)" letter-spacing="-1">${tspans}</text>
<text x="40" y="${startY + lines.length * lineH + 16}" fill="rgba(255,255,255,.5)" font-size="13" font-weight="500" font-family="${ff}">${statLabel}</text>`;
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

  const statSvg = hasStat ? buildStatSvg(statValue, statLabel, accent, ff) : '';
  const statEndY = hasStat ? (() => {
    const lines = wrapText(statValue, Math.max(10, Math.min(18, Math.floor(520 / (statValue.split(' ').length > 3 ? 22 : 26)))));
    const lineH = lines.length > 3 ? 38 : 44;
    return 280 + lines.length * lineH + 16 + 20;
  })() : 0;
  const titleY = hasStat ? Math.max(580, statEndY + 80) : 540;
  const subY = titleY + 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>${overlayDef}
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  ${bgLayer}

  <rect x="24" y="20" width="552" height="48" rx="24" fill="#000" opacity=".25"/>
  <rect x="24" y="20" width="552" height="48" rx="24" fill="none" stroke="${accentBorder}" stroke-width="1"/>
  <g transform="translate(36,28)"><g transform="translate(0,6)">${insightLogo}</g><text x="38" y="31" fill="#fff" font-size="16" font-weight="800" font-family="${ff}" letter-spacing="4">INSIGHT</text></g>
  ${statLabel && !hasStat ? `<g transform="translate(462,28)"><rect x="0" y="0" width="90" height="32" rx="16" fill="${accentLight}"/><text x="45" y="20" fill="${accent}" font-size="12" font-weight="700" font-family="${ff}" text-anchor="middle">${statLabel}</text></g>` : ''}

  ${statSvg}

  <text x="40" y="${titleY}" fill="#fff" font-size="${title.length > 22 ? 24 : 28}" font-weight="700" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${truncate(title, 42)}</tspan></text>
  <text x="40" y="${subY}" fill="#94a3b8" font-size="16" font-weight="500" font-family="${ff}" line-height="1.4"><tspan x="40" dy="0">${subtitle}</tspan></text>

  <text x="560" y="878" fill="#ed1c24" font-size="11" font-weight="700" font-family="${ff}" text-anchor="end" opacity=".8">trakt</text>
</svg>`;
}

export function generateCompactPosterSvg(opts: {
  title: string;
  subtitle: string;
  accent: string;
  statValue?: string;
  statLabel?: string;
}) {
  const { accent, statValue, statLabel } = opts;
  const title = escapeXml(opts.title || '');
  const subtitle = escapeXml(opts.subtitle || '');
  const ff = FONT_FAMILY;
  const sv = statValue ? escapeXml(statValue) : '';
  const sl = statLabel ? escapeXml(statLabel) : '';
  const accentLight = accent + '22';
  const accentBorder = accent + '44';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0f172a"/>
    <stop offset="55%" stop-color="${accentLight}"/>
    <stop offset="100%" stop-color="#020617"/>
  </linearGradient>
  <radialGradient id="g1" cx="80%" cy="10%" r="60%">
    <stop offset="0%" stop-color="${accent}" stop-opacity=".35"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="g2" cx="20%" cy="90%" r="50%">
    <stop offset="0%" stop-color="${accent}" stop-opacity=".2"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  <rect width="300" height="450" fill="url(#bg)"/>
  <rect width="300" height="450" fill="url(#g1)"/>
  <rect width="300" height="450" fill="url(#g2)"/>

  <rect x="12" y="10" width="276" height="24" rx="12" fill="#000" opacity=".25"/>
  <rect x="12" y="10" width="276" height="24" rx="12" fill="none" stroke="${accentBorder}" stroke-width="1"/>
  <g transform="translate(18,14)"><polygon points="-6,-9 6,-9 0,9" fill="#ffffff"/><polygon points="-3,-5 3,-5 0,5" fill="${accent}"/><text x="22" y="6" fill="#fff" font-size="10" font-weight="800" font-family="${ff}" letter-spacing="3">INSIGHT</text></g>

  ${sv ? `<text x="20" y="160" fill="${accent}" font-size="${sv.length > 6 ? 28 : 36}" font-weight="900" font-family="${ff}" filter="url(#s)" letter-spacing="-1">${sv}</text>
<text x="20" y="180" fill="rgba(255,255,255,.5)" font-size="9" font-weight="500" font-family="${ff}">${sl}</text>` : ''}

  <text x="20" y="${sv ? 360 : 240}" fill="#fff" font-size="${title.length > 20 ? 12 : 14}" font-weight="700" font-family="${ff}" filter="url(#s)">${truncate(title, 32)}</text>
  <text x="20" y="${sv ? 378 : 260}" fill="#94a3b8" font-size="9" font-weight="500" font-family="${ff}">${truncate(subtitle, 60)}</text>

  <text x="280" y="438" fill="#ed1c24" font-size="8" font-weight="700" font-family="${ff}" text-anchor="end" opacity=".8">trakt</text>
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

  const statSvg = hasStat ? buildStatSvg(statValue, statLabel, esc(accent), ff) : '';
  const statEndY = hasStat ? (() => {
    const lines = wrapText(statValue, Math.max(10, Math.min(18, Math.floor(520 / (statValue.split(' ').length > 3 ? 22 : 26)))));
    const lineH = lines.length > 3 ? 38 : 44;
    return 280 + lines.length * lineH + 16 + 20;
  })() : 0;
  const titleY = hasStat ? Math.max(580, statEndY + 80) : 540;
  const subY = titleY + 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
  <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>

  <rect x="24" y="20" width="552" height="48" rx="24" fill="#000" opacity=".25"/>
  <rect x="24" y="20" width="552" height="48" rx="24" fill="none" stroke="${esc(accentBorder)}" stroke-width="1"/>
  <g transform="translate(36,28)"><g transform="translate(0,6)">${insightLogo}</g><text x="38" y="31" fill="#fff" font-size="16" font-weight="800" font-family="${ff}" letter-spacing="4">INSIGHT</text></g>
  ${statLabel && !hasStat ? `<g transform="translate(462,28)"><rect x="0" y="0" width="90" height="32" rx="16" fill="${esc(accentLight)}"/><text x="45" y="20" fill="${esc(accent)}" font-size="12" font-weight="700" font-family="${ff}" text-anchor="middle">${esc(statLabel)}</text></g>` : ''}

  ${statSvg}

  <text x="40" y="${titleY}" fill="#fff" font-size="${title.length > 22 ? 24 : 28}" font-weight="700" font-family="${ff}" filter="url(#s)"><tspan x="40" dy="0">${esc(truncate(title, 42))}</tspan></text>
  <text x="40" y="${subY}" fill="#94a3b8" font-size="16" font-weight="500" font-family="${ff}" line-height="1.4"><tspan x="40" dy="0">${esc(truncate(subtitle, SUBTITLE_MAX))}</tspan></text>

  <text x="560" y="878" fill="#ed1c24" font-size="11" font-weight="700" font-family="${ff}" text-anchor="end" opacity=".8">trakt</text>
</svg>`;
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
