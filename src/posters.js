function esc(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

const palettes = {
  watchtime: ['#0f172a', '#0ea5e9', '#67e8f9'],
  topgenre: ['#1f172a', '#7c3aed', '#c4b5fd'],
  streak: ['#2b1100', '#f97316', '#fdba74'],
  mood: ['#0f1b14', '#10b981', '#6ee7b7'],
  dropped: ['#2a1118', '#e11d48', '#f9a8d4'],
  binge: ['#251404', '#f59e0b', '#fde68a'],
  default: ['#111827', '#2563eb', '#93c5fd']
};

function pick(kind='default') {
  return palettes[kind] || palettes.default;
}

export function svgPosterDataURI(title='InsightBoard', color='#01696f', kind='default', subtitle='Personal analytics') {
  const [bg1, bg2, accent] = pick(kind);
  const t = esc(title);
  const sub = esc(subtitle);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="55%" stop-color="${bg2}"/>
        <stop offset="100%" stop-color="${color || accent}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="20%" r="60%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="30"/></filter>
    </defs>

    <rect width="600" height="900" fill="url(#g)"/>
    <circle cx="460" cy="150" r="170" fill="url(#glow)" filter="url(#blur)"/>
    <circle cx="120" cy="760" r="140" fill="url(#glow)" filter="url(#blur)"/>

    <g opacity="0.14">
      <rect x="52" y="54" width="496" height="792" rx="34" fill="none" stroke="white"/>
      <rect x="72" y="74" width="456" height="752" rx="28" fill="none" stroke="white"/>
    </g>

    <g transform="translate(70,90)">
      <rect x="0" y="0" width="92" height="92" rx="24" fill="rgba(255,255,255,0.14)"/>
      <rect x="22" y="56" width="10" height="20" rx="3" fill="white" fill-opacity="0.95"/>
      <rect x="38" y="42" width="10" height="34" rx="3" fill="white" fill-opacity="0.95"/>
      <rect x="54" y="26" width="10" height="50" rx="3" fill="white" fill-opacity="0.95"/>
    </g>

    <text x="70" y="245" fill="white" font-family="Inter,Arial,sans-serif" font-size="26" opacity="0.82" letter-spacing="3">INSIGHTBOARD</text>
    <text x="70" y="340" fill="white" font-family="Inter,Arial,sans-serif" font-size="62" font-weight="800">${t}</text>
    <text x="70" y="390" fill="white" font-family="Inter,Arial,sans-serif" font-size="28" opacity="0.82">${sub}</text>

    <g transform="translate(70,520)">
      <rect x="0" y="0" width="460" height="170" rx="28" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.15)"/>
      <text x="34" y="58" fill="white" font-family="Inter,Arial,sans-serif" font-size="18" opacity="0.8">SMART CARD</text>
      <text x="34" y="102" fill="white" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700">Visual analytics</text>
      <text x="34" y="136" fill="white" font-family="Inter,Arial,sans-serif" font-size="22" opacity="0.75">Readable, premium, immediate</text>
    </g>

    <text x="70" y="825" fill="white" font-family="Inter,Arial,sans-serif" font-size="18" opacity="0.66">Generated dynamically from your Trakt activity</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
