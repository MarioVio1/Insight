import sharp from 'sharp';

const W = 600;
const H = 900;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function autoSize(text: string, maxWidth: number, baseSize: number, charRatio = 0.6): number {
  const est = text.length * baseSize * charRatio;
  return est > maxWidth ? Math.floor(maxWidth / (text.length * charRatio)) : baseSize;
}

const ICONS: Record<string, string> = {
  // Heroicons outline — MIT license
  sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
  film: 'M3.375 3C2.339 3 1.5 3.839 1.5 4.875v.75c0 1.036.839 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z',
  tv: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v8.25A2.25 2.25 0 0 1 18 16.5H6a2.25 2.25 0 0 1-2.25-2.25V6Z',
  fire: 'M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a.75.75 0 0 0-2.717-.545Z',
  star: 'M12 2.25l2.445 5.775 6.305.55-4.775 4.075 1.425 6.2L12 15.75l-5.4 3.1L8.025 12.65 3.25 8.575l6.305-.55L12 2.25Z',
  person: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25c0-3.315 3.134-6 7.5-6s7.5 2.685 7.5 6',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  trophy: 'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.496m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.496 14.25a7.454 7.454 0 0 0 .982-3.172m5.007 0c0-2.25-.75-3.75-2.25-5.25l-1.5-1.5-1.5 1.5c-1.5 1.5-2.25 3-2.25 5.25m5.007 0H9.496',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  trendUp: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  play: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5.25-3l-7.5 4.5v-9l7.5 4.5Z',
  heart: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z',
  eye: 'M3.53 12c1.92-4.12 5.634-7 9.97-7s8.05 2.88 9.97 7c-1.92 4.12-5.634 7-9.97 7s-8.05-2.88-9.97-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  pen: 'M16.862 3.487a2.25 2.25 0 0 1 3.182 3.182L7.5 19.311l-4.5.689.689-4.5L16.862 3.487Z',
  clapper: 'M4.5 6.375a2.625 2.625 0 0 1 2.625-2.625h9.75a2.625 2.625 0 0 1 2.625 2.625v.75H4.5v-.75ZM4.5 9v5.625A2.625 2.625 0 0 0 7.125 17.25h9.75a2.625 2.625 0 0 0 2.625-2.625V9H4.5Z',
  bars3: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  arrowTrend: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
  globe: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418',
};

export function pickIcon(cardType?: string): string {
  const ct = cardType?.toLowerCase() || '';
  if (ct.includes('streak') || ct.includes('peak')) return ICONS.fire;
  if (ct.includes('genre') || ct.includes('top5')) return ICONS.sparkles;
  if (ct.includes('binge')) return ICONS.play;
  if (ct.includes('dropped') || ct.includes('break')) return ICONS.clock;
  if (ct.includes('rewatch') || ct.includes('revision')) return ICONS.heart;
  if (ct.includes('seasonal') || ct.includes('monthly') || ct.includes('yearly')) return ICONS.calendar;
  if (ct.includes('actor') || ct.includes('attore') || ct.includes('person')) return ICONS.person;
  if (ct.includes('director') || ct.includes('regista')) return ICONS.clapper;
  if (ct.includes('writer') || ct.includes('scenegg')) return ICONS.pen;
  if (ct.includes('anime')) return ICONS.globe;
  if (ct.includes('ranking') || ct.includes('top')) return ICONS.trophy;
  if (ct.includes('decade') || ct.includes('vintage') || ct.includes('decenn')) return ICONS.clock;
  if (ct.includes('firstplay') || ct.includes('memories') || ct.includes('ricord')) return ICONS.star;
  if (ct.includes('notturno') || ct.includes('night') || ct.includes('matiniero') || ct.includes('pomeriggio')) return ICONS.clock;
  if (ct.includes('intensita') || ct.includes('trend')) return ICONS.arrowTrend;
  if (ct.includes('tipologia') || ct.includes('split') || ct.includes('confronto')) return ICONS.bars3;
  if (ct.includes('weekend') || ct.includes('settimana') || ct.includes('weekly') || ct.includes('giorni')) return ICONS.calendar;
  if (ct.includes('totals') || ct.includes('total')) return ICONS.chart;
  if (ct.includes('events') || ct.includes('pace') || ct.includes('ritmo')) return ICONS.bolt;
  if (ct.includes('serie') || ct.includes('series') || ct.includes('tv')) return ICONS.tv;
  return ICONS.film;
}

function textSvg(title: string, subtitle: string, accent: string, statValue?: string, statLabel?: string, icon?: string) {
  const hasStat = !!statValue;
  const iconPath = icon || '';

  const valY = hasStat ? 320 : 380;
  const labelY = valY + 60;
  const titleY = hasStat ? 600 : 520;
  const subY = hasStat ? 635 : 560;
  const ff = 'system-ui,-apple-system,sans-serif';
  const valSize = hasStat ? autoSize(statValue!, 460, 110) : autoSize(title, 460, 36);
  const titleSize = hasStat ? autoSize(title, 460, 24, 0.65) : 0;

  const iconHtml = iconPath ? `<g transform="translate(300,${valY - 70})">
    <rect x="-32" y="-32" width="64" height="64" rx="16" fill="${accent}" opacity=".12"/>
    <rect x="-32" y="-32" width="64" height="64" rx="16" fill="none" stroke="${accent}" stroke-width="1" opacity=".3"/>
    <path d="${iconPath}" fill="${accent}" transform="translate(-12,-12) scale(24/24)"/>
  </g>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    ${iconHtml}
    <text x="300" y="${valY}" fill="#fff" font-size="${valSize}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle" filter="url(#glow)">${hasStat ? esc(statValue!) : esc(title)}</text>
    ${hasStat && statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="16" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(trunc(statLabel, 26)).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="${titleSize}" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(trunc(title, 26))}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="14" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(trunc(hasStat ? subtitle : subtitle, 44))}</text>
    <rect x="42" y="838" width="516" height="1" fill="rgba(255,255,255,.08)"/>
    <text x="42" y="865" fill="rgba(255,255,255,.15)" font-size="11" font-weight="600" font-family="${ff}" letter-spacing="2">INSIGHT</text>
    <text x="558" y="865" fill="${accent}" font-size="18" font-weight="900" text-anchor="end" font-family="${ff}">&#9679;</text>
  </svg>`;
}

function gradientSvg(accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".25"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".12"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#050505"/>
    <rect width="100%" height="100%" fill="url(#a)"/>
    <rect width="100%" height="100%" fill="url(#b)"/>
  </svg>`;
}

function overlayGradient() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".75"/><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
}

export function generateSvgPoster(opts: {
  title: string; subtitle: string; accent?: string; theme?: string;
  statValue?: string; statLabel?: string; imageUrl?: string;
  icon?: string;
}) {
  const accent = opts.accent || '#0ea5e9';
  const hasStat = !!opts.statValue;
  const iconPath = opts.icon || '';

  const valY = hasStat ? 320 : 380;
  const labelY = valY + 60;
  const titleY = hasStat ? 600 : 520;
  const subY = hasStat ? 635 : 560;
  const ff = 'system-ui,-apple-system,sans-serif';
  const valSize = hasStat ? autoSize(opts.statValue!, 460, 110) : autoSize(opts.title, 460, 36);
  const titleSize = hasStat ? autoSize(opts.title, 460, 24, 0.65) : 0;
  const img = opts.imageUrl;

  const defs = img ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : `<radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".25"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".12"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const bg = img ? `<image href="${img}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="100%" height="100%" fill="#050505"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>`;
  const ov = img ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".75"/><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>` : '';

  const iconHtml = iconPath ? `<g transform="translate(300,${valY - 70})">
    <rect x="-32" y="-32" width="64" height="64" rx="16" fill="${accent}" opacity=".12"/>
    <rect x="-32" y="-32" width="64" height="64" rx="16" fill="none" stroke="${accent}" stroke-width="1" opacity=".3"/>
    <path d="${iconPath}" fill="${accent}" transform="translate(-12,-12) scale(24/24)"/>
  </g>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${bg}${ov}
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    ${iconHtml}
    <text x="300" y="${valY}" fill="#fff" font-size="${valSize}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle" filter="url(#glow)">${hasStat ? esc(opts.statValue!) : esc(opts.title)}</text>
    ${hasStat && opts.statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="16" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(trunc(opts.statLabel, 26)).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="${titleSize}" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(trunc(opts.title, 26))}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="14" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(trunc(hasStat ? opts.subtitle : opts.subtitle, 44))}</text>
    <rect x="42" y="838" width="516" height="1" fill="rgba(255,255,255,.08)"/>
    <text x="42" y="865" fill="rgba(255,255,255,.15)" font-size="11" font-weight="600" font-family="${ff}" letter-spacing="2">INSIGHT</text>
    <text x="558" y="865" fill="${accent}" font-size="18" font-weight="900" text-anchor="end" font-family="${ff}">&#9679;</text>
  </svg>`;
}

const TW = 1280;
const TH = 720;

const THUMB_ICON_SIZE = 40;
const POSTER_ICON_SIZE = 48;

export function generateSvgThumbnail(opts: {
  title: string; subtitle: string; accent?: string;
  statValue?: string; statLabel?: string; imageUrl?: string;
  icon?: string;
  barValue?: number; barMax?: number;
}) {
  const accent = opts.accent || '#0ea5e9';
  const img = opts.imageUrl;
  const hasImg = !!img;
  const hasStat = !!opts.statValue;
  const iconPath = opts.icon || ICONS.film;
  const hasBar = opts.barValue != null && opts.barMax != null && opts.barMax > 0;
  const barPct = hasBar ? Math.min(Math.max((opts.barValue! / opts.barMax!) * 100, 0), 100) : 0;

  const textMaxW = hasImg ? 520 : 1100;
  const titleSize = hasStat ? autoSize(opts.title, textMaxW, hasImg ? 48 : 64, 0.6) : autoSize(opts.title, textMaxW, hasImg ? 56 : 76, 0.6);
  const valSize = hasStat ? autoSize(opts.statValue!, hasImg ? 380 : textMaxW, hasImg ? 68 : 96) : 0;
  const subSize = hasImg ? 18 : 22;

  const defs = `<radialGradient id="g1" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".3"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<radialGradient id="g2" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".15"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,.08)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>
<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

  // Cover image box (right side)
  const boxX = 660;
  const boxY = 60;
  const boxW = 560;
  const boxH = 560;
  const boxR = 28;

  const coverHtml = hasImg ? `
    <g transform="translate(${boxX},${boxY})">
      <rect x="0" y="0" width="${boxW}" height="${boxH}" rx="${boxR}" fill="#0a0a0a" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/>
      <rect x="0" y="0" width="${boxW}" height="${boxH * 0.35}" rx="${boxR}" fill="url(#shine)"/>
      <clipPath id="c"><rect x="8" y="8" width="${boxW - 16}" height="${boxH - 16}" rx="${boxR - 8}"/></clipPath>
      <image href="${img}" x="8" y="8" width="${boxW - 16}" height="${boxH - 16}" preserveAspectRatio="xMidYMid meet" clip-path="url(#c)"/>
      <rect x="0" y="0" width="${boxW}" height="${boxH}" rx="${boxR}" fill="none" stroke="${accent}" stroke-width="1" opacity=".35"/>
    </g>` : '';

  // Left content
  const lx = 56;
  let ttY = 100;

  // Icon badge
  const iconHtml = `<g transform="translate(${lx},${ttY})">
    <rect x="-8" y="-8" width="${THUMB_ICON_SIZE + 16}" height="${THUMB_ICON_SIZE + 16}" rx="12" fill="${accent}" opacity=".15"/>
    <rect x="-8" y="-8" width="${THUMB_ICON_SIZE + 16}" height="${THUMB_ICON_SIZE + 16}" rx="12" fill="none" stroke="${accent}" stroke-width="1" opacity=".4"/>
    <path d="${iconPath}" fill="${accent}" transform="translate(0,0) scale(${THUMB_ICON_SIZE / 24})"/>
  </g>`;
  ttY += THUMB_ICON_SIZE + 24;

  // Stat value + label
  let statHtml = '';
  if (hasStat) {
    const valY = ttY + valSize * 0.7;
    statHtml = `<text x="${lx}" y="${valY}" fill="#fff" font-size="${valSize}" font-weight="900" font-family="system-ui,-apple-system,sans-serif" filter="url(#glow)">${esc(trunc(opts.statValue!, hasImg ? 14 : 24))}</text>`;
    ttY = valY + 10;
    if (opts.statLabel) {
      const lblY = ttY + (hasImg ? 20 : 26);
      statHtml += `<text x="${lx}" y="${lblY}" fill="${accent}" font-size="${hasImg ? 15 : 20}" font-weight="700" font-family="system-ui,-apple-system,sans-serif" letter-spacing="3">${esc(trunc(opts.statLabel, hasImg ? 22 : 36)).toUpperCase()}</text>`;
      ttY = lblY + (hasImg ? 32 : 42);
    }
  }

  // Title
  const titleY = hasStat ? ttY + titleSize * 0.6 : (hasImg ? 220 : 280);
  const titleHtml = `<text x="${lx}" y="${titleY}" fill="#fff" font-size="${titleSize}" font-weight="800" font-family="system-ui,-apple-system,sans-serif">${esc(trunc(opts.title, hasImg ? 20 : 36))}</text>`;

  // Subtitle (below title)
  const subY = (hasStat ? titleY : titleY) + (titleSize > 28 ? (hasImg ? 36 : 44) : (hasImg ? 28 : 34));
  const subHtml = opts.subtitle ? `<text x="${lx}" y="${subY}" fill="rgba(255,255,255,.35)" font-size="${subSize}" font-weight="500" font-family="system-ui,-apple-system,sans-serif">${esc(trunc(opts.subtitle, hasImg ? 36 : 72))}</text>` : '';

  // Stat bar at bottom
  const barHtml = hasBar ? `
    <g transform="translate(${lx},${TH - 80})">
      <rect x="0" y="0" width="${textMaxW}" height="4" rx="2" fill="rgba(255,255,255,.08)"/>
      <rect x="0" y="0" width="${textMaxW * (barPct / 100)}" height="4" rx="2" fill="${accent}"/>
      <text x="0" y="24" fill="rgba(255,255,255,.25)" font-size="11" font-weight="600" font-family="system-ui,-apple-system,sans-serif" letter-spacing="1">${barPct.toFixed(0)}%</text>
    </g>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">
    <defs>${defs}</defs>
    <rect width="100%" height="100%" fill="#050505"/>
    <rect width="100%" height="100%" fill="url(#g1)"/>
    <rect width="100%" height="100%" fill="url(#g2)"/>
    <!-- Glass card -->
    <rect x="24" y="24" width="1232" height="672" rx="28" fill="url(#shine)" opacity=".5"/>
    <rect x="24" y="24" width="1232" height="672" rx="28" fill="rgba(255,255,255,.02)"/>
    <rect x="24" y="24" width="1232" height="672" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="1232" height="3" rx="1.5" fill="${accent}" opacity=".8"/>
    ${iconHtml}
    ${statHtml}
    ${titleHtml}
    ${subHtml}
    ${coverHtml}
    ${barHtml}
    <!-- Footer -->
    <rect x="56" y="${TH - 44}" width="1168" height="1" fill="rgba(255,255,255,.06)"/>
    <text x="56" y="${TH - 22}" fill="rgba(255,255,255,.1)" font-size="10" font-weight="700" font-family="system-ui,-apple-system,sans-serif" letter-spacing="2.5">INSIGHT</text>
    <circle cx="${TW - 56}" cy="${TH - 22}" r="4" fill="${accent}" opacity=".6"/>
  </svg>`;
}

export function generateBackgroundSvg(accent: string) {
  return gradientSvg(accent);
}

export function generateOverlaySvg(opts: {
  title: string; subtitle: string; accent: string; statValue: string; statLabel: string;
}) {
  return textSvg(opts.title, opts.subtitle, opts.accent, opts.statValue, opts.statLabel);
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function getRatingColor(rating: number): string {
  if (rating >= 8) return '#22c55e';
  if (rating >= 6) return '#eab308';
  if (rating >= 4) return '#f97316';
  return '#ef4444';
}

export function ratingBadgeSvg(rating: number, style: string, sourceLabel: string): string {
  const color = getRatingColor(rating);
  const star = '&#9733;';
  const label = sourceLabel ? esc(sourceLabel) : 'RATING';
  if (style === 'pill') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="64" viewBox="0 0 200 64">
      <rect x="0" y="0" width="200" height="64" rx="32" fill="${color}" opacity="0.9"/>
      <text x="100" y="42" fill="#000" font-size="28" font-weight="900" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${star} ${rating.toFixed(1)}</text>
    </svg>`;
  }
  if (style === 'circle') {
    const r = 48;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r*2}" height="${r*2}" viewBox="0 0 ${r*2} ${r*2}">
      <circle cx="${r}" cy="${r}" r="${r-2}" fill="${color}" opacity="0.9"/>
      <text x="${r}" y="${r+14}" fill="#000" font-size="36" font-weight="900" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${rating.toFixed(1)}</text>
    </svg>`;
  }
  if (style === 'minimal') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36" viewBox="0 0 160 36">
      <rect x="0" y="0" width="160" height="36" rx="4" fill="${color}" opacity="0.85"/>
      <text x="14" y="25" fill="#000" font-size="16" font-weight="800" font-family="Arial,Helvetica,sans-serif">${star} ${rating.toFixed(1)}</text>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="68" viewBox="0 0 220 68">
    <rect x="0" y="0" width="220" height="68" rx="8" fill="#000" opacity="0.55"/>
    <rect x="0" y="0" width="220" height="68" rx="8" fill="${color}" opacity="0.2"/>
    <rect x="0" y="0" width="6" height="68" fill="${color}" rx="3"/>
    <text x="20" y="30" fill="${color}" font-size="11" font-weight="700" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.5">${label}</text>
    <text x="20" y="55" fill="#fff" font-size="30" font-weight="900" font-family="Arial,Helvetica,sans-serif">${star} ${rating.toFixed(1)}</text>
  </svg>`;
}

export async function generateArtworkWithBadge(opts: {
  imageBuffer?: Buffer | null;
  rating: number;
  width: number;
  height: number;
  badgeStyle?: string;
  source?: string;
}): Promise<Buffer> {
  const { imageBuffer, rating, width: outW, height: outH, badgeStyle = 'star', source = 'TMDB' } = opts;
  const layers: { input: Buffer; top: number; left: number }[] = [];

  if (imageBuffer) {
    const base = await sharp(imageBuffer)
      .resize(outW, outH, { fit: 'cover', position: 'center' })
      .modulate({ brightness: 0.9, saturation: 0.95 })
      .png({ compressionLevel: 1 })
      .toBuffer();
    layers.push({ input: base, top: 0, left: 0 });
    const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".4"/><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".5"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`;
    const overlay = await sharp(Buffer.from(overlaySvg)).png({ compressionLevel: 1 }).toBuffer();
    layers.push({ input: overlay, top: 0, left: 0 });
  }

  if (rating > 0) {
    const badgeW = Math.min(Math.round(outW * 0.55), 200);
    const badgeH = Math.round(badgeW * 0.32);
    const badgeSvg = ratingBadgeSvg(rating, badgeStyle, source);
    const badgeBuf = await sharp(Buffer.from(badgeSvg))
      .resize(badgeW, badgeH, { fit: 'contain' })
      .png({ compressionLevel: 1 })
      .toBuffer();
    const badgePad = Math.max(Math.round(outW * 0.04), 4);
    layers.push({ input: badgeBuf, top: badgePad, left: outW - badgeW - badgePad });
  }

  return sharp({
    create: { width: outW, height: outH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .composite(layers)
    .png({ compressionLevel: 6 })
    .toBuffer();
}

export async function generatePosterBuffer(opts: {
  title: string; subtitle: string; accent?: string;
  statValue?: string; statLabel?: string;
  imageBuffer?: Buffer | null;
  icon?: string;
}) {
  const accent = opts.accent || '#0ea5e9';
  const layers: { input: Buffer; top: number; left: number }[] = [];

  if (opts.imageBuffer) {
    const base = await sharp(opts.imageBuffer)
      .resize(W, H, { fit: 'cover', position: 'center' })
      .modulate({ brightness: 0.85, saturation: 0.9 })
      .png({ compressionLevel: 1 })
      .toBuffer();
    layers.push({ input: base, top: 0, left: 0 });
  } else {
    const fallback = await sharp(Buffer.from(gradientSvg(accent))).png({ compressionLevel: 1 }).toBuffer();
    layers.push({ input: fallback, top: 0, left: 0 });
  }

  const overlay = await sharp(Buffer.from(overlayGradient())).png({ compressionLevel: 1 }).toBuffer();
  layers.push({ input: overlay, top: 0, left: 0 });

  const text = await sharp(Buffer.from(textSvg(opts.title, opts.subtitle, accent, opts.statValue, opts.statLabel, opts.icon)))
    .png({ compressionLevel: 1 })
    .toBuffer();
  layers.push({ input: text, top: 0, left: 0 });

  return sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .composite(layers)
    .png({ compressionLevel: 6 })
    .toBuffer();
}
