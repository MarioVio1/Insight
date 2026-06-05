import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
const router = Router();
router.post('/config', async (req, res) => {
  const id = crypto.randomUUID();
  const body = req.body || {};
  const payload = {
    id,
    sync_enabled: body.sync_enabled ?? true,
    selected_catalogs: body.selected_catalogs ?? ['watchlist-movies', 'watchlist-series', 'history-movies', 'history-series']
  };
  const { error } = await supabase.from('addon_configs').insert(payload);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ id, configureUrl: `${process.env.BASE_URL}/configure/${id}` });
});
router.get('/config/:configId', async (req, res) => {
  const { data, error } = await supabase.from('addon_configs').select('id,trakt_username,sync_enabled,selected_catalogs,last_sync_at').eq('id', req.params.configId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  return res.json(data);
});
router.put('/config/:configId', async (req, res) => {
  const { error } = await supabase.from('addon_configs').update(req.body).eq('id', req.params.configId);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});
export default router;
