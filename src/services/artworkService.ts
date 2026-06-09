import sharp from 'sharp';

const W = 600;
const H = 900;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textSvg(title: string, subtitle: string, accent: string, statValue?: string, statLabel?: string) {
  const ff = 'sans-serif';
  const hasStat = !!statValue;
  const ty = hasStat ? 620 : 540;
  const sy = hasStat ? 665 : 585;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect x="20" y="20" width="560" height="860" rx="36" fill="none" stroke="#ffffff18" stroke-width="1.5"/>
    <rect x="32" y="32" width="536" height="6" rx="3" fill="${accent}" opacity="0.7"/>
    <text x="40" y="90" fill="${accent}" font-size="16" font-weight="700" font-family="${ff}" letter-spacing="3">INSIGHT</text>
    <line x1="40" y1="104" x2="132" y2="104" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
    ${hasStat ? `<text x="40" y="480" fill="#fff" font-size="72" font-weight="900" font-family="${ff}">${esc(statValue!)}</text>
    ${statLabel ? `<text x="40" y="520" fill="${accent}" font-size="20" font-weight="600" font-family="${ff}" letter-spacing="1">${esc(statLabel)}</text>` : ''}` : ''}
    <text x="40" y="${ty}" fill="#fff" font-size="32" font-weight="800" font-family="${ff}">${esc(title)}</text>
    <text x="40" y="${sy}" fill="#94a3b8" font-size="16" font-family="${ff}">${esc(subtitle)}</text>
    <rect x="40" y="820" width="520" height="2" rx="1" fill="${accent}" opacity="0.25"/>
    <text x="40" y="852" fill="#475569" font-size="12" font-family="${ff}" letter-spacing="1">TRACKT STATS</text>
  </svg>`;
}

function gradientSvg(accent: string, theme = '#0f172a') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme}"/><stop offset="55%" stop-color="${accent}22"/><stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <radialGradient id="g1" cx="80%" cy="10%" r="60%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="20%" cy="90%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.2"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#g1)"/><rect width="100%" height="100%" fill="url(#g2)"/>
  </svg>`;
}

function darkOverlaySvg(w: number, h: number, top: boolean) {
  const stops = top
    ? '<stop offset="0" stop-color="#000" stop-opacity=".88"/><stop offset=".55" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/>'
    : '<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".35" stop-color="#000" stop-opacity=".25"/><stop offset=".7" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity=".92"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="100%" height="100%" fill="url(#d)"/></svg>`;
}

function vignetteSvg() {
  return `<svg width="${W}" height="${H}"><defs><radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".65"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`;
}

export function generateSvgPoster(opts: {
  title: string; subtitle: string; accent?: string; theme?: string;
  statValue?: string; statLabel?: string; imageUrl?: string;
}) {
  const accent = opts.accent || '#0ea5e9';
  const theme = opts.theme || '#0f172a';
  const ff = 'sans-serif';
  const hasStat = !!opts.statValue;
  const ty = hasStat ? 620 : 540;
  const sy = hasStat ? 665 : 585;
  const img = opts.imageUrl;
  const defs = img ? `<linearGradient id="ol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0.1"/><stop offset="50%" stop-color="#000" stop-opacity="0.6"/><stop offset="100%" stop-color="#000" stop-opacity="0.95"/></linearGradient>`
    : `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${theme}"/><stop offset="55%" stop-color="${accent}22"/><stop offset="100%" stop-color="#020617"/></linearGradient>
    <radialGradient id="g1" cx="80%" cy="10%" r="60%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="20%" cy="90%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.2"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>`;
  const bg = img
    ? `<image href="${img}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/><rect width="600" height="900" fill="url(#ol)"/>`
    : `<rect width="600" height="900" fill="url(#bg)"/><rect width="600" height="900" fill="url(#g1)"/><rect width="600" height="900" fill="url(#g2)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs>${defs}</defs>${bg}
    <rect x="20" y="20" width="560" height="860" rx="36" fill="none" stroke="#ffffff18" stroke-width="1.5"/>
    <rect x="32" y="32" width="536" height="6" rx="3" fill="${accent}" opacity="0.7"/>
    <text x="40" y="90" fill="${accent}" font-size="16" font-weight="700" font-family="${ff}" letter-spacing="3">INSIGHT</text>
    <line x1="40" y1="104" x2="132" y2="104" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
    ${hasStat ? `<text x="40" y="480" fill="#ffffff" font-size="72" font-weight="900" font-family="${ff}">${esc(opts.statValue!)}</text>
    ${opts.statLabel ? `<text x="40" y="520" fill="${accent}" font-size="20" font-weight="600" font-family="${ff}" letter-spacing="1">${esc(opts.statLabel)}</text>` : ''}` : ''}
    <text x="40" y="${ty}" fill="#ffffff" font-size="32" font-weight="800" font-family="${ff}">${esc(opts.title)}</text>
    <text x="40" y="${sy}" fill="#94a3b8" font-size="16" font-family="${ff}">${esc(opts.subtitle)}</text>
    <rect x="40" y="820" width="520" height="2" rx="1" fill="${accent}" opacity="0.25"/>
    <text x="40" y="852" fill="#475569" font-size="12" font-family="${ff}" letter-spacing="1">TRACKT STATS</text>
  </svg>`;
}

export function generateBackgroundSvg(accent: string, theme = '#0f172a') {
  return gradientSvg(accent, theme);
}

export function generateOverlaySvg(opts: {
  title: string; subtitle: string; accent: string; statValue: string; statLabel: string;
}) {
  return textSvg(opts.title, opts.subtitle, opts.accent, opts.statValue, opts.statLabel);
}

export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function generatePosterBuffer(opts: {
  title: string; subtitle: string; accent?: string;
  statValue?: string; statLabel?: string;
  imageBuffer?: Buffer | null;
}) {
  const accent = opts.accent || '#0ea5e9';
  const overlays: { input: Buffer; top: number; left: number }[] = [];

  if (opts.imageBuffer) {
    const base = await sharp(opts.imageBuffer)
      .resize(W, H, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 1 })
      .toBuffer();
    overlays.push({ input: base, top: 0, left: 0 });

    // Top blur band (~22% of height)
    const th = Math.round(H * 0.22);
    const topBand = await sharp(opts.imageBuffer)
      .resize(W, H, { fit: 'cover', position: 'center' })
      .extract({ left: 0, top: 0, width: W, height: th })
      .blur(16)
      .composite([{ input: Buffer.from(darkOverlaySvg(W, th, true)) }])
      .png({ compressionLevel: 1 })
      .toBuffer();
    overlays.push({ input: topBand, top: 0, left: 0 });

    // Bottom blur band (~38% of height)
    const bh = Math.round(H * 0.38);
    const bt = H - bh;
    const botBand = await sharp(opts.imageBuffer)
      .resize(W, H, { fit: 'cover', position: 'center' })
      .extract({ left: 0, top: bt, width: W, height: bh })
      .blur(18)
      .composite([{ input: Buffer.from(darkOverlaySvg(W, bh, false)) }])
      .png({ compressionLevel: 1 })
      .toBuffer();
    overlays.push({ input: botBand, top: bt, left: 0 });

    // Vignette
    overlays.push({ input: Buffer.from(vignetteSvg()), top: 0, left: 0 });
  } else {
    const grad = await sharp(Buffer.from(gradientSvg(accent))).png().toBuffer();
    overlays.push({ input: grad, top: 0, left: 0 });
  }

  // Text on top
  overlays.push({ input: Buffer.from(textSvg(opts.title, opts.subtitle, accent, opts.statValue, opts.statLabel)), top: 0, left: 0 });

  return sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .composite(overlays)
    .png({ compressionLevel: 6 })
    .toBuffer();
}
