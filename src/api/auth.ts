import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { buildAuthorizeUrl, exchangeCodeForToken, getUserSettings } from '../services/trakt.js';
import { encrypt } from '../services/crypto.js';
import { syncConfig } from '../services/syncService.js';
import { resolveConfigId } from '../services/db.js';

const router = Router();

router.get('/login/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).send('Config not found');
  res.redirect(buildAuthorizeUrl(req.params.configId));
});

router.get('/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state) return res.status(400).send('Missing code/state');

  const uuid = await resolveConfigId(state);
  if (!uuid) return res.status(404).send('Config not found');

  const token = await exchangeCodeForToken(code);
  const settings = await getUserSettings(token.access_token);
  const traktUsername = settings.user?.username || null;

  if (traktUsername) {
    const { data: dup } = await supabase
      .from('addon_configs')
      .select('id, slug')
      .eq('trakt_username', traktUsername)
      .neq('id', uuid)
      .maybeSingle();

    if (dup) {
      await supabase.from('addon_configs').update({
        access_token_enc: encrypt(token.access_token),
        refresh_token_enc: encrypt(token.refresh_token),
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        sync_enabled: true
      }).eq('id', dup.id);

      await supabase.from('addon_configs').delete().eq('id', uuid);
      await supabase.from('config_preferences').delete().eq('config_id', uuid);

      await syncConfig(dup.id);
      return res.send(`<html><body style="font-family:sans-serif;padding:40px"><h1>Trakt collegato</h1><p>Account già esistente, riconnesso.</p><p><a href="/configure/${dup.slug}">Torna alla configurazione</a></p></body></html>`);
    }
  }

  await supabase.from('addon_configs').update({
    trakt_username: traktUsername,
    access_token_enc: encrypt(token.access_token),
    refresh_token_enc: encrypt(token.refresh_token),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    sync_enabled: true
  }).eq('id', uuid);

  await syncConfig(uuid);
  res.send(`<html><body style="font-family:sans-serif;padding:40px"><h1>Trakt collegato</h1><p>Configurazione pronta.</p><p><a href="/configure/${state}">Torna alla configurazione</a></p></body></html>`);
});

export default router;
