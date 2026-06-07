import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
import { syncConfig } from '../services/syncService.js';
import { resolveConfigId } from '../services/db.js';

const router = Router();

router.post('/config', async (req, res) => {
  try {
    const body = req.body || {};
    let slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slug) slug = crypto.randomUUID().slice(0, 8);

    const { data: existing } = await supabase
      .from('addon_configs')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) {
      return res.json({ ok: true, id: existing.id, slug, configureUrl: `/configure/${slug}` });
    }

    const id = crypto.randomUUID();
    const payload = { id, slug, sync_enabled: true, selected_catalogs: ['adaptive-insights'] };
    const { error } = await supabase.from('addon_configs').insert(payload);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    await supabase.from('config_preferences').insert({
      config_id: id,
      max_cards: body.max_cards ?? parseInt(process.env.DEFAULT_CARD_COUNT || '10', 10),
      enabled_card_types: body.enabled_card_types ?? ['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking'],
      focus_mode: body.focus_mode ?? 'adaptive',
      seasonal_enabled: body.seasonal_enabled ?? true,
      festive_enabled: body.festive_enabled ?? true,
      style_mode: body.style_mode ?? 'cinematic'
    });

    return res.json({ ok: true, id, slug, configureUrl: `/configure/${slug}` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/config/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const { data: cfg } = await supabase.from('addon_configs').select('*').eq('id', uuid).maybeSingle();
  const { data: pref } = await supabase.from('config_preferences').select('*').eq('config_id', uuid).maybeSingle();
  if (!cfg) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, ...cfg, preferences: pref });
});

router.put('/config/:configId/preferences', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const { error: err1 } = await supabase.from('config_preferences').update(req.body).eq('config_id', uuid);
  if (err1) return res.status(500).json({ ok: false, error: err1.message });
  await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
  return res.json({ ok: true });
});

router.post('/config/:configId/sync', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });

  const result = await syncConfig(uuid);
  if (result.ok) {
    await supabase.from('addon_configs').update({ updated_at: new Date().toISOString() }).eq('id', uuid);
  }
  return res.json(result);
});

export default router;
