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
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}" />
        <stop offset="100%" stop-color="#ffffff22" />
      </linearGradient>
    </defs>
    <rect width="600" height="900" fill="url(#bg)"/>
    <circle cx="500" cy="120" r="140" fill="url(#accent)" opacity="0.35"/>
    <rect x="48" y="48" width="504" height="804" rx="28" fill="#ffffff10" stroke="#ffffff22"/>
    <text x="60" y="110" fill="#cbd5e1" font-size="24" font-family="Arial">Adaptive Insights</text>
    <text x="60" y="720" fill="#ffffff" font-size="54" font-weight="700" font-family="Arial">${title}</text>
    <text x="60" y="780" fill="#cbd5e1" font-size="26" font-family="Arial">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
