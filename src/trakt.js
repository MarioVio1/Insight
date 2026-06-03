import 'dotenv/config';

const BASE = 'https://api.trakt.tv';

function traktHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': process.env.TRAKT_USER_AGENT || 'InsightBoard/1.1.0 (HF Space)',
    'trakt-api-version': '2',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function asJson(res) {
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || data?.error_description || raw || `trakt_http_${res.status}`);
    err.status = res.status;
    err.body = raw;
    err.json = data;
    throw err;
  }
  return data ?? (raw ? JSON.parse(raw) : null);
}

export async function exchangeCode(code) {
  const r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: process.env.TRAKT_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });
  return asJson(r);
}

export async function refreshToken(refresh) {
  const r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refresh,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: process.env.TRAKT_REDIRECT_URI,
      grant_type: 'refresh_token'
    })
  });
  return asJson(r);
}

export async function getMe(token) {
  const r = await fetch(`${BASE}/users/me`, { headers: traktHeaders(token) });
  return asJson(r);
}

export async function getProfile(token) {
  return getMe(token);
}

export async function getHistory(token, type = 'movies', page = 1, limit = 200) {
  const r = await fetch(`${BASE}/users/me/history/${type}?page=${page}&limit=${limit}`, {
    headers: traktHeaders(token)
  });
  return asJson(r);
}

function normalizeHistoryItem(item, type) {
  const isMovie = type === 'movies';
  return {
    source: 'trakt',
    type: isMovie ? 'movie' : 'episode',
    external_id: `trakt:${item.id}`,
    tmdb_id: isMovie ? String(item.movie?.ids?.tmdb || '') : String(item.show?.ids?.tmdb || ''),
    title: isMovie ? item.movie?.title : item.show?.title,
    season: item.episode?.season || null,
    episode: item.episode?.number || null,
    watched_at: item.watched_at,
    progress: 100,
    runtime_min: isMovie ? (item.movie?.runtime || null) : (item.episode?.runtime || item.show?.runtime || null),
    genres: []
  };
}

export async function getAllHistory(token) {
  const results = [];
  for (const type of ['movies', 'episodes']) {
    let page = 1;
    let keepGoing = true;
    while (keepGoing) {
      const batch = await getHistory(token, type, page, 200);
      if (!Array.isArray(batch) || batch.length === 0) {
        keepGoing = false;
        break;
      }
      results.push(...batch.map(item => normalizeHistoryItem(item, type)));
      if (batch.length < 200) keepGoing = false;
      else page++;
    }
  }
  return results.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
}
