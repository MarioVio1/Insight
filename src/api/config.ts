import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
import { syncConfig } from '../services/syncService.js';

const router = Router();

router.post('/config', async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const body = req.body || {};
    const payload = {
      id,
      sync_enabled: true,
      selected_catalogs: ['adaptive-insights']
    };
    const { error } = await supabase.from('addon_configs').insert(payload);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    await supabase.from('config_preferences').insert({
      config_id: id,
      max_cards: body.max_cards ?? parseInt(process.env.DEFAULT_CARD_COUNT || '10', 10),
      enabled_card_types: body.enabled_card_types ?? ['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal'],
      focus_mode: body.focus_mode ?? 'adaptive',
      seasonal_enabled: body.seasonal_enabled ?? true,
      festive_enabled: body.festive_enabled ?? true,
      style_mode: body.style_mode ?? 'cinematic'
    });
    return res.json({ ok: true, id, configureUrl: `/configure/${id}` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/config/:configId', async (req, res) => {
  const { data: cfg } = await supabase.from('addon_configs').select('*').eq('id', req.params.configId).maybeSingle();
  const { data: pref } = await supabase.from('config_preferences').select('*').eq('config_id', req.params.configId).maybeSingle();
  if (!cfg) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, ...cfg, preferences: pref });
});

router.put('/config/:configId/preferences', async (req, res) => {
  const { error } = await supabase.from('config_preferences').update(req.body).eq('config_id', req.params.configId);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});

router.post('/config/:configId/sync', async (req, res) => {
  const result = await syncConfig(req.params.configId);
  return res.json(result);
});

export default router;
