import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
  supabase,
  getUserBySlug,
  upsertUser,
  getProfiles,
  getProfile,
  upsertProfile,
  deleteProfile,
  upsertWatchEvents,
  getWatchHistory
} from './db.js';
import { exchangeCode, getMe } from './trakt.js';
import { syncUser } from './sync.js';
import { computeInsights, buildCatalogs, buildMetaPreview } from './analytics.js';
import { svgPosterDataURI } from './posters.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 7860);
const BASE_URL = String(process.env.BASE_URL || `http://localhost:${PORT}`).trim().replace(/\/$/, '');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, '../public')));

app.get('/', (req, res) => res.sendFile(join(__dirname, '../public/configure.html')));
app.get('/configure', (req, res) => res.sendFile(join(__dirname, '../public/configure.html')));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'TRAKT_CLIENT_ID', 'TRAKT_CLIENT_SECRET', 'TRAKT_REDIRECT_URI'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.error('❌ Variabili ENV mancanti:', missingEnv.join(', '));
}

function safeJson(res, fn) {
  return Promise.resolve(fn()).then(x => res.json(x)).catch(err => {
    console.error('[API ERROR]', err?.message || err);
    res.status(500).json({ error: err?.message || 'server_error' });
  });
}



app.get('/api/debug/user/:slug', async (req, res) => {
  try {
    const user = await getUserBySlug(req.params.slug);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const profiles = await getProfiles(user.id);
    res.json({
      user: {
        slug: user.slug,
        trakt_username: user.trakt_username,
        has_trakt_token: !!user.trakt_token,
        has_tmdb_key: !!user.tmdb_key
      },
      profiles_count: profiles.length,
      profiles
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/debug/trakt-url/:slug', (req, res) => {
  const userSlug = String(req.params.slug || '').trim().toLowerCase();
  const state = Buffer.from(JSON.stringify({ userSlug })).toString('base64url');
  const redirect = String(process.env.TRAKT_REDIRECT_URI || '').trim();
  const url = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${encodeURIComponent(process.env.TRAKT_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}`;
  res.json({ userSlug, redirect_uri: redirect, authorize_url: url });
});

app.get('/health', (req, res) => res.json({ ok:true }));
app.get('/api/debug/env', (req, res) => {
  res.json({
    base_url: BASE_URL,
    trakt_redirect_uri: String(process.env.TRAKT_REDIRECT_URI || '').trim(),
    trakt_client_id_present: !!process.env.TRAKT_CLIENT_ID,
    trakt_client_secret_present: !!process.env.TRAKT_CLIENT_SECRET,
    trakt_user_agent: process.env.TRAKT_USER_AGENT || null
  });
});

app.post('/api/user', async (req, res) => {
  try {
    const { slug, tmdb_key } = req.body || {};
    if (!slug || !/^[a-z0-9_-]+$/i.test(slug)) {
      return res.status(400).json({ error: 'slug non valido' });
    }
    const user = await upsertUser(slug, tmdb_key ? { tmdb_key } : {});
    const profiles = await getProfiles(user.id);
    return res.json({ user, profiles });
  } catch (e) {
    console.error('[POST /api/user]', e);
    return res.status(500).json({ error: e?.message || 'impossibile creare utente' });
  }
});

app.get('/api/user/:slug', (req, res) => safeJson(res, async () => {
  const user = await getUserBySlug(req.params.slug);
  if (!user) return { error: 'not found' };
  const profiles = await getProfiles(user.id);
  return { user, profiles };
}));

app.get('/api/user/:slug/profiles', (req, res) => safeJson(res, async () => {
  const user = await getUserBySlug(req.params.slug);
  if (!user) throw new Error('not found');
  return await getProfiles(user.id);
}));

app.post('/api/user/:slug/profiles', async (req, res) => {
  try {
    const user = await getUserBySlug(req.params.slug);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const body = req.body || {};
    console.log('[POST /profiles body]', JSON.stringify(body));
    const slug = String(body.slug || '').trim().toLowerCase();
    const name = String(body.name || slug || 'Default').trim();
    const emoji = body.emoji || '🎬';
    const color = body.color || '#01696f';
    if (!slug) return res.status(400).json({ error: 'slug obbligatorio' });
    const profile = await upsertProfile(user.id, { slug, name, emoji, color });
    return res.json(profile);
  } catch (e) {
    console.error('[POST /profiles]', e);
    return res.status(500).json({ error: e?.message || 'errore profilo' });
  }
});

app.delete('/api/user/:slug/profiles/:profileSlug', async (req, res) => {
  try {
    const user = await getUserBySlug(req.params.slug);
    if (!user) return res.status(404).json({ error: 'user not found' });
    await deleteProfile(user.id, req.params.profileSlug);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /profiles]', e);
    return res.status(500).json({ error: e?.message || 'errore delete profilo' });
  }
});

app.post('/api/user/:slug/sync', async (req, res) => {
  try {
    const result = await syncUser(req.params.slug);
    return res.json(result);
  } catch (e) {
    console.error('[POST /sync]', e);
    return res.status(500).json({ error: e?.message || 'errore sync' });
  }
});

app.get('/auth/trakt/start', async (req, res) => {
  try {
    const userSlug = String(req.query.userSlug || '').trim().toLowerCase();
    if (!userSlug) return res.redirect('/configure?error=missing_user');
    const state = Buffer.from(JSON.stringify({ userSlug })).toString('base64url');
    const redirect = String(process.env.TRAKT_REDIRECT_URI || '').trim();
    const clientId = String(process.env.TRAKT_CLIENT_ID || '').trim();
    const url = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}`;
    return res.redirect(url);
  } catch (e) {
    console.error('[TRAKT START]', e);
    return res.redirect('/configure?error=trakt_start_failed');
  }
});

app.get('/auth/trakt/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect('/configure?error=trakt_no_code');
    const parsed = state ? JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8')) : {};
    const userSlug = parsed.userSlug;
    if (!userSlug) return res.redirect('/configure?error=missing_user_state');

    const tokens = await exchangeCode(String(code));
    if (!tokens?.access_token) return res.redirect('/configure?error=trakt_exchange_failed');

    const me = await getMe(tokens.access_token).catch(() => null);

    await upsertUser(userSlug, {
      trakt_token: tokens.access_token,
      trakt_refresh: tokens.refresh_token,
      trakt_expires: Date.now() + (tokens.expires_in * 1000),
      trakt_username: me?.username || null
    });

    return res.redirect(`/configure?user=${encodeURIComponent(userSlug)}&trakt=ok`);
  } catch (e) {
    console.error('[TRAKT CALLBACK]', { message: e?.message, status: e?.status, body: e?.body, json: e?.json });
    return res.redirect(`/configure?error=${encodeURIComponent((e?.message || 'trakt_callback_failed').slice(0,180))}`);
  }
});

app.get('/:userSlug/:profileSlug/manifest.json', async (req, res) => {
  try {
    const { userSlug, profileSlug } = req.params;
    const user = await getUserBySlug(userSlug);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const profile = await getProfile(user.id, profileSlug);
    if (!profile) return res.status(404).json({ error: 'profile not found' });

    res.json({
      id: `org.insightboard.${userSlug}.${profileSlug}`,
      version: '1.1.0',
      name: `InsightBoard – ${profile.name}`,
      description: `Analytics personali Stremio/Trakt per ${profile.name}`,
      resources: ['catalog', 'meta'],
      types: ['movie', 'series'],
      catalogs: buildCatalogs(userSlug, profileSlug),
      behaviorHints: { configurable: true },
      logo: svgPosterDataURI('InsightBoard', '#01696f', 'addon'),
      background: svgPosterDataURI('InsightBoard', '#28251d', 'background'),
      configurationURL: `${BASE_URL}/configure?user=${encodeURIComponent(userSlug)}&profile=${encodeURIComponent(profileSlug)}`
    });
  } catch (e) {
    console.error('[MANIFEST]', e);
    res.status(500).json({ error: e?.message || 'manifest_error' });
  }
});

app.get('/catalog/:type/:id/:extra?.json', async (req, res) => {
  try {
    const extra = req.params.extra || '';
    const m = extra.match(/user=([^&]+)&profile=([^&]+)/);
    const userSlug = m ? decodeURIComponent(m[1]) : req.query.user;
    const profileSlug = m ? decodeURIComponent(m[2]) : req.query.profile;
    if (!userSlug || !profileSlug) return res.json({ metas: [] });

    const user = await getUserBySlug(userSlug);
    if (!user) return res.json({ metas: [] });
    const profile = await getProfile(user.id, profileSlug);
    if (!profile) return res.json({ metas: [] });

    const events = await getWatchHistory(user.id, profile.id, 3650);
    const insights = computeInsights(events);
    const metas = buildMetaPreview(req.params.id, insights, userSlug, profileSlug);
    return res.json({ metas });
  } catch (e) {
    console.error('[CATALOG]', e);
    return res.json({ metas: [] });
  }
});

app.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const userSlug = req.query.user;
    const profileSlug = req.query.profile;
    if (!userSlug || !profileSlug) return res.json({ meta: null });

    const user = await getUserBySlug(userSlug);
    if (!user) return res.json({ meta: null });
    const profile = await getProfile(user.id, profileSlug);
    if (!profile) return res.json({ meta: null });

    const events = await getWatchHistory(user.id, profile.id, 3650);
    const insights = computeInsights(events);
    const metas = buildMetaPreview(id, insights, userSlug, profileSlug);
    const meta = metas.find(x => x.id === id) || metas[0] || null;
    return res.json({ meta });
  } catch (e) {
    console.error('[META]', e);
    return res.json({ meta: null });
  }
});

cron.schedule('0 */6 * * *', () => {
  (async () => {
    try {
      console.log('[CRON] sync automatico');
      const { data: users } = await supabase.from('ib_users').select('slug,trakt_token');
      if (!users?.length) return;
      for (const u of users) {
        if (!u.trakt_token) continue;
        try {
          await syncUser(u.slug);
        } catch (e) {
          console.error('[CRON user]', u.slug, e?.message || e);
        }
      }
    } catch (e) {
      console.error('[CRON]', e?.message || e);
    }
  })();
});

app.use((err, req, res, next) => {
  console.error('[EXPRESS ERROR]', err);
  res.status(500).json({ error: err?.message || 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`🚀 InsightBoard v1.1.0 → ${BASE_URL}`);
  console.log(`   Configure: ${BASE_URL}/configure`);
  console.log(`   Manifest:  ${BASE_URL}/<slug>/<profilo>/manifest.json`);
});
