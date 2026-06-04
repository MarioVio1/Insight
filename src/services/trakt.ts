import axios from 'axios';
const api = axios.create({
  baseURL: 'https://api.trakt.tv',
  headers: {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID!
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
export async function getWatchlist(accessToken: string, type: 'movies'|'shows') {
  const path = type === 'movies' ? '/sync/watchlist/movies' : '/sync/watchlist/shows';
  const { data } = await api.get(path, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}
export async function getHistory(accessToken: string, type: 'movies'|'shows') {
  const path = type === 'movies' ? '/sync/history/movies' : '/sync/history/shows';
  const { data } = await api.get(path, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}
export function buildAuthorizeUrl(state: string) {
  const u = new URL('https://trakt.tv/oauth/authorize');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', process.env.TRAKT_CLIENT_ID!);
  u.searchParams.set('redirect_uri', process.env.TRAKT_REDIRECT_URI!);
  u.searchParams.set('state', state);
  return u.toString();
}
