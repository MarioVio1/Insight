import { Router } from 'express';
import authRouter from './auth.js';
import configRouter from './config.js';
import { supabase } from '../services/supabase.js';
import { resolveConfigId } from '../services/db.js';
const router = Router();
router.use('/auth', authRouter);
router.use('/api', configRouter);

router.get('/api/export/:configId', async (req, res) => {
  try {
    const uuid = await resolveConfigId(req.params.configId);
    if (!uuid) return res.status(404).json({ ok: false, error: 'Config non trovata' });

    const { data: events } = await supabase
      .from('trakt_events')
      .select('*')
      .eq('config_id', uuid)
      .order('watched_at', { ascending: false });

    const { data: insight } = await supabase
      .from('insight_snapshots')
      .select('*')
      .eq('config_id', uuid)
      .maybeSingle();

    const { data: cfg } = await supabase
      .from('addon_configs')
      .select('trakt_username, slug')
      .eq('id', uuid)
      .maybeSingle();

    const exportData = {
      exported_at: new Date().toISOString(),
      username: cfg?.trakt_username || null,
      slug: cfg?.slug || null,
      total_events: events?.length || 0,
      events: events || [],
      insights: insight || null
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="trakt-export-${cfg?.slug || uuid}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
