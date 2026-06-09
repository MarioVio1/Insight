import sharp from 'sharp';

const W = 600;
const H = 900;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textSvg(title: string, subtitle: string, accent: string, statValue?: string, statLabel?: string) {
  const hasStat = !!statValue;
  const valY = hasStat ? 360 : 400;
  const labelY = valY + 70;
  const titleY = hasStat ? 620 : 540;
  const subY = hasStat ? 655 : 580;
  const ff = 'sans-serif';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    <text x="300" y="${valY}" fill="#fff" font-size="${hasStat ? 120 : 40}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle">${hasStat ? esc(statValue!) : esc(title)}</text>
    ${hasStat && statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="18" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(statLabel).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="26" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(title)}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="15" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(hasStat ? subtitle : subtitle)}</text>
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
  const img = opts.imageUrl;
  const defs = img ? '' : `<radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="${accent}" stop-opacity=".25"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="20%" cy="80%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".12"/><stop offset="100%" stop-color="${accent}" stop-opacity="0"/></radialGradient>`;
  const bg = img ? `<image href="${img}" width="600" height="900" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="100%" height="100%" fill="#050505"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>`;
  const ov = img ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity=".75"/><stop offset="30%" stop-color="#000" stop-opacity="0"/><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${bg}${ov}
    <rect x="24" y="24" width="552" height="852" rx="28" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    <rect x="24" y="24" width="552" height="4" rx="2" fill="${accent}"/>
    <text x="300" y="${valY}" fill="#fff" font-size="${hasStat ? 120 : 40}" font-weight="900" text-anchor="middle" font-family="${ff}" dominant-baseline="middle">${hasStat ? esc(opts.statValue!) : esc(opts.title)}</text>
    ${hasStat && opts.statLabel ? `<text x="300" y="${labelY}" fill="${accent}" font-size="18" font-weight="700" text-anchor="middle" font-family="${ff}" letter-spacing="3" dominant-baseline="middle">${esc(opts.statLabel).toUpperCase()}</text>` : ''}
    ${hasStat ? `<text x="300" y="${titleY}" fill="#fff" font-size="26" font-weight="800" text-anchor="middle" font-family="${ff}">${esc(opts.title)}</text>` : ''}
    <text x="300" y="${subY}" fill="rgba(255,255,255,.4)" font-size="15" font-weight="500" text-anchor="middle" font-family="${ff}">${esc(hasStat ? opts.subtitle : opts.subtitle)}</text>
    <rect x="42" y="838" width="516" height="1" fill="rgba(255,255,255,.08)"/>
    <text x="42" y="865" fill="rgba(255,255,255,.15)" font-size="11" font-weight="600" font-family="${ff}" letter-spacing="2">INSIGHT</text>
    <text x="558" y="865" fill="${accent}" font-size="18" font-weight="900" text-anchor="end" font-family="${ff}">&#9679;</text>
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
