import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { buildAuthorizeUrl, exchangeCodeForToken, getUserSettings } from '../services/trakt.js';
import { encrypt } from '../services/crypto.js';
import { syncConfig } from '../services/syncService.js';
const router = Router();
router.get('/login/:configId', async (req, res) => res.redirect(buildAuthorizeUrl(req.params.configId)));
router.get('/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state) return res.status(400).send('Missing code/state');
  const token = await exchangeCodeForToken(code);
  const settings = await getUserSettings(token.access_token);
  await supabase.from('addon_configs').update({
    trakt_username: settings.user?.username || null,
    access_token_enc: encrypt(token.access_token),
    refresh_token_enc: encrypt(token.refresh_token),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    sync_enabled: true
  }).eq('id', state);
  await syncConfig(state);
  res.send(`<html><body style="font-family:sans-serif;padding:40px"><h1>Trakt collegato</h1><p>Configurazione pronta.</p><p><a href="/configure/${state}">Torna alla configurazione</a></p></body></html>`);
});
export default router;
