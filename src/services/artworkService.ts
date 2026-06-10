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

function textSvg(title: string, subtitle: string, accent: string, statValue?: string, statLabel?: string) {
  const hasStat = !!statValue;
  const valY = hasStat ? 360 : 400;
  const labelY = valY + 70;
  const titleY = hasStat ? 620 : 540;
  const subY = hasStat ? 655 : 580;
  const ff = 'sans-serif';
  const valSize = hasStat ? autoSize(statValue!, 500, 120) : autoSize(title, 500, 40);
  const titleSize = hasStat ? autoSize(title, 500, 26, 0.65) : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    <text x="300" y="${valY}" fill="#fff" font-size="${valSize}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle">${hasStat ? esc(statValue!) : esc(title)}</text>
    ${hasStat && statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="18" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(trunc(statLabel, 28)).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="${titleSize}" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(trunc(title, 28))}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="15" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(trunc(hasStat ? subtitle : subtitle, 46))}</text>
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
}) {
  const accent = opts.accent || '#0ea5e9';
  const hasStat = !!opts.statValue;
  const valY = hasStat ? 360 : 400;
  const labelY = valY + 70;
  const titleY = hasStat ? 620 : 540;
  const subY = hasStat ? 655 : 580;
  const ff = 'sans-serif';
  const valSize = hasStat ? autoSize(opts.statValue!, 500, 120) : autoSize(opts.title, 500, 40);
  const titleSize = hasStat ? autoSize(opts.title, 500, 26, 0.65) : 0;
  const img = opts.imageUrl;
  const defs = img ? '' : `<radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".25"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".12"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>`;
  const bg = img ? `<image href="${img}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="100%" height="100%" fill="#050505"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>`;
  const ov = img ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".75"/><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${bg}${ov}
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    <text x="300" y="${valY}" fill="#fff" font-size="${valSize}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle">${hasStat ? esc(opts.statValue!) : esc(opts.title)}</text>
    ${hasStat && opts.statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="18" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(trunc(opts.statLabel, 28)).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="${titleSize}" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(trunc(opts.title, 28))}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="15" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(trunc(hasStat ? opts.subtitle : opts.subtitle, 46))}</text>
    <rect x="42" y="838" width="516" height="1" fill="rgba(255,255,255,.08)"/>
    <text x="42" y="865" fill="rgba(255,255,255,.15)" font-size="11" font-weight="600" font-family="${ff}" letter-spacing="2">INSIGHT</text>
    <text x="558" y="865" fill="${accent}" font-size="18" font-weight="900" text-anchor="end" font-family="${ff}">&#9679;</text>
  </svg>`;
}

const TW = 1280;
const TH = 720;

export function generateSvgThumbnail(opts: {
  title: string; subtitle: string; accent?: string;
  statValue?: string; statLabel?: string; imageUrl?: string;
}) {
  const accent = opts.accent || '#0ea5e9';
  const ff = 'sans-serif';
  const img = opts.imageUrl;
  const hasImg = !!img;
  const hasStat = !!opts.statValue;

  const titleSize = hasStat ? autoSize(opts.title, 500, 32, 0.6) : autoSize(opts.title, 1100, 42, 0.6);
  const valSize = hasStat ? autoSize(opts.statValue!, 320, 50) : 0;
  const subSize = 16;

  const defs = `<radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".25"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".12"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>`;

  // Cover box on the right (when imageUrl is available)
  const boxX = 660;
  const boxY = 90;
  const boxW = 550;
  const boxH = 550;
  const boxR = 20;

  const coverHtml = hasImg ? `
    <defs>
      <clipPath id="coverClip"><rect x="${boxX + 4}" y="${boxY + 4}" width="${boxW - 8}" height="${boxH - 8}" rx="${boxR - 4}"/></clipPath>
    </defs>
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="${boxR}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="2"/>
    <rect x="${boxX + 4}" y="${boxY + 4}" width="${boxW - 8}" height="${boxH - 8}" rx="${boxR - 4}" fill="#111"/>
    <image href="${img}" x="${boxX + 4}" y="${boxY + 4}" width="${boxW - 8}" height="${boxH - 8}" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)"/>
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="${boxR}" fill="none" stroke="${accent}" stroke-width="1" opacity=".3"/>
  ` : '';

  // Title + stat on the left
  const textX = 56;
  const titleHtml = hasStat
    ? `<text x="${textX}" y="170" fill="#fff" font-size="${valSize}" font-weight="900" font-family="${ff}">${esc(trunc(opts.statValue!, 20))}</text>
       ${opts.statLabel ? `<text x="${textX}" y="206" fill="${accent}" font-size="13" font-weight="700" font-family="${ff}" letter-spacing="2">${esc(trunc(opts.statLabel, 28)).toUpperCase()}</text>` : ''}
       <text x="${textX}" y="270" fill="#fff" font-size="${titleSize}" font-weight="800" font-family="${ff}">${esc(trunc(opts.title, 28))}</text>`
    : `<text x="${textX}" y="200" fill="#fff" font-size="${titleSize}" font-weight="800" font-family="${ff}">${esc(trunc(opts.title, 36))}</text>`;

  const subtitleHtml = hasImg
    ? `<text x="${textX}" y="${hasStat ? 318 : 260}" fill="rgba(255,255,255,.4)" font-size="${subSize}" font-weight="500" font-family="${ff}">${esc(trunc(opts.subtitle, 50))}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">
    <defs>${defs}</defs>
    <rect width="100%" height="100%" fill="#050505"/>
    <rect width="100%" height="100%" fill="url(#a)"/>
    <rect width="100%" height="100%" fill="url(#b)"/>
    <rect x="24" y="24" width="1232" height="672" rx="24" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="1232" height="3" rx="1.5" fill="${accent}"/>
    ${titleHtml}
    ${subtitleHtml}
    ${coverHtml}
    <rect x="48" y="678" width="1184" height="1" fill="rgba(255,255,255,.08)"/>
    <text x="48" y="698" fill="rgba(255,255,255,.12)" font-size="10" font-weight="600" font-family="${ff}" letter-spacing="2">INSIGHT</text>
    <text x="1232" y="698" fill="${accent}" font-size="14" font-weight="900" text-anchor="end" font-family="${ff}">&#9679;</text>
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

  const text = await sharp(Buffer.from(textSvg(opts.title, opts.subtitle, accent, opts.statValue, opts.statLabel)))
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
