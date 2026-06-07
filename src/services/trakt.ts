import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.trakt.tv',
  headers: {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID || ''
  }
});

export async function exchangeCodeForToken(code: string) {
  const { data } = await api.post('/oauth/token', {
    code,
    client_id: process.env.TRAKT_CLIENT_ID,
    client_secret: process.env.TRAKT_CLIENT_SECRET,
    redirect_uri: process.env.TRAKT_REDIRECT_URI,
    grant_type: 'authorization_code'
  });
  return data;
}

export async function refreshToken(refresh_token: string) {
  const { data } = await api.post('/oauth/token', {
    refresh_token,
    client_id: process.env.TRAKT_CLIENT_ID,
    client_secret: process.env.TRAKT_CLIENT_SECRET,
    redirect_uri: process.env.TRAKT_REDIRECT_URI,
    grant_type: 'refresh_token'
  });
  return data;
}

export async function getUserSettings(accessToken: string) {
  const { data } = await api.get('/users/settings', { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}

export async function getHistory(accessToken: string, type: 'movies' | 'shows') {
  const path = type === 'movies' ? '/sync/history/movies' : '/sync/history/shows';
  const headers = { Authorization: `Bearer ${accessToken}` };
  const allItems: any[] = [];

  // First request to get pagination info
  const first = await api.get(path, { headers, params: { page: 1, limit: 100 } });
  const items = first.data || [];
  allItems.push(...items);

  // Parse pagination headers
  const pageCount = parseInt(first.headers['x-pagination-page-count'] || '1', 10);
  const totalItems = parseInt(first.headers['x-pagination-item-count'] || String(items.length), 10);

  // Fetch remaining pages in parallel
  if (pageCount > 1) {
    const pages = [];
    for (let p = 2; p <= pageCount; p++) {
      pages.push(api.get(path, { headers, params: { page: p, limit: 100 } }).then(r => r.data || []));
    }
    const results = await Promise.all(pages);
    for (const pageItems of results) {
      allItems.push(...pageItems);
    }
  }

  return allItems;
}

export function buildAuthorizeUrl(state: string) {
  const u = new URL('https://trakt.tv/oauth/authorize');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', process.env.TRAKT_CLIENT_ID || '');
  u.searchParams.set('redirect_uri', process.env.TRAKT_REDIRECT_URI || '');
  u.searchParams.set('state', state);
  return u.toString();
}
