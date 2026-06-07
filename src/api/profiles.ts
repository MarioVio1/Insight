import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase.js';
import { resolveConfigId } from '../services/db.js';
const router = Router();

router.get('/profiles/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });
  const { data, error } = await supabase.from('user_profiles').select('*').eq('config_id', uuid);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, profiles: data ?? [] });
});

router.post('/profiles/:configId', async (req, res) => {
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ ok: false, error: 'Not found' });
  const body = req.body || {};
  const payload = {
    id: crypto.randomUUID(),
    config_id: uuid,
    name: body.name || 'Nuovo profilo',
    slug: body.slug || `profile-${Date.now()}`,
    is_default: false,
    avatar_url: body.avatar_url || null,
    accent_color: body.accent_color || '#22c55e'
  };
  const { error } = await supabase.from('user_profiles').insert(payload);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, profile: payload });
});

export default router;
