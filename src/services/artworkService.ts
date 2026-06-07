import { searchTmdbMulti, tmdbImage } from './tmdbService.js';

export async function findArtworkForTitle(title: string) {
  try {
    const result = await searchTmdbMulti(title);
    if (!result) return { poster: null, background: null, source: 'none' };
    return {
      poster: tmdbImage(result.poster_path),
      background: tmdbImage(result.backdrop_path || result.poster_path),
      source: 'tmdb'
    };
  } catch {
    return { poster: null, background: null, source: 'none' };
  }
}

export function generateSvgPoster(opts: { title: string; subtitle: string; accent?: string; theme?: string }) {
  const accent = opts.accent || '#0ea5e9';
  const theme = opts.theme || '#0f172a';
  const title = escapeXml(opts.title);
  const subtitle = escapeXml(opts.subtitle);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme}" />
        <stop offset="60%" stop-color="${accent}22" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.4" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${accent}" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <circle cx="520" cy="80" r="200" fill="url(#glow)"/>
    <circle cx="80" cy="780" r="160" fill="url(#glow)" opacity="0.5"/>
    <rect x="24" y="24" width="552" height="852" rx="32" fill="url(#shine)" stroke="#ffffff15" stroke-width="1.5"/>
    <rect x="36" y="36" width="528" height="8" rx="4" fill="${accent}" opacity="0.6"/>
    <text x="48" y="100" fill="${accent}" font-size="18" font-weight="600" font-family="Arial" letter-spacing="2">INSIGHT</text>
    <line x1="48" y1="115" x2="160" y2="115" stroke="${accent}" stroke-width="2" opacity="0.5"/>
    <text x="48" y="680" fill="#ffffff" font-size="44" font-weight="800" font-family="Arial" filter="url(#shadow)">${title}</text>
    <text x="48" y="740" fill="#94a3b8" font-size="22" font-weight="400" font-family="Arial">${subtitle}</text>
    <rect x="48" y="800" width="504" height="3" rx="2" fill="${accent}" opacity="0.3"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
