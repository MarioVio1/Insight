import { Router } from 'express';
import { fetchImageBuffer } from '../services/tmdbService.js';
import { generateArtworkWithBadge } from '../services/artworkService.js';
import { ImageCache } from '../services/imageCache.js';
import { ProxyService } from '../services/proxyService.js';

const SIZES: Record<string, { w: number; h: number; tmdb: string }> = {
  poster:       { w: 300, h: 450, tmdb: 'poster' },
  backdrop:     { w: 1280, h: 720, tmdb: 'backdrop' },
  logo:         { w: 400, h: 200, tmdb: 'logo' },
  'custom-logo': { w: 600, h: 300, tmdb: 'logo' },
  thumbnail:    { w: 92, h: 138, tmdb: 'poster' },
};

export function artworkRoutes(cache: ImageCache, proxyService: ProxyService) {
  const router = Router();

  router.get('/artwork/:type', async (req, res) => {
    try {
      const type = req.params.type;
      const tmdbId = (req.query.id as string) || '';
      const rating = parseFloat(req.query.rating as string) || 0;
      const badgeStyle = (req.query.badge_style as string) || 'star';
      const source = (req.query.source as string) || 'TMDB';
      const mediaType = (req.query.media_type as string || 'movie') as 'movie' | 'tv';
      const dim = SIZES[type] || SIZES.poster;

      const cacheKey = `art:${type}:${tmdbId}:${rating}:${badgeStyle}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=300');
        return res.send(cached);
      }

      let imageBuffer: Buffer | null = null;
      if (tmdbId) {
        const { fetchTmdbPoster } = await import('../services/tmdbService.js');
        const url = await fetchTmdbPoster(tmdbId, mediaType);
        if (url) {
          try { imageBuffer = await fetchImageBuffer(url); } catch {}
        }
      }

      const buf = await generateArtworkWithBadge({
        imageBuffer,
        rating,
        width: dim.w,
        height: dim.h,
        badgeStyle,
        source,
      });

      cache.set(cacheKey, buf);
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=300');
      res.send(buf);
    } catch (err: any) {
      res.status(500).send(err.message || 'Internal error');
    }
  });

  router.get('/artwork/:type/:id', async (req, res) => {
    const q = new URLSearchParams(req.query as any);
    q.set('id', req.params.id);
    if (!q.has('rating')) q.set('rating', '0');
    res.redirect(`/artwork/${req.params.type}?${q.toString()}`);
  });

  router.get('/artwork-url', (req, res) => {
    const type = (req.query.type as string) || 'poster';
    const id = (req.query.id as string) || '';
    const rating = (req.query.rating as string) || '0';
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let url = `${baseUrl}/artwork/${type}?rating=${rating}`;
    if (id) url += `&id=${id}`;
    if (req.query.badge_style) url += `&badge_style=${req.query.badge_style}`;
    if (req.query.source) url += `&source=${req.query.source}`;
    res.json({ url });
  });

  router.post('/api/proxy/create', async (req, res) => {
    try {
      const { manifestUrl, rating = 7.5, rewriteTypes = ['poster', 'backdrop'], badgeStyle = 'star' } = req.body;
      if (!manifestUrl) return res.status(400).json({ error: 'manifestUrl required' });
      const result = await proxyService.createProxy(manifestUrl, rating, rewriteTypes, badgeStyle);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/api/proxy/list', (_req, res) => {
    res.json(proxyService.list());
  });

  router.delete('/api/proxy/:token', (req, res) => {
    proxyService.delete(req.params.token);
    res.json({ ok: true });
  });

  router.get('/proxy/:token/manifest.json', async (req, res) => {
    const manifest = await proxyService.getManifest(req.params.token);
    if (!manifest) return res.status(404).json({ error: 'Proxy not found' });
    res.json(manifest);
  });

  router.get('/proxy/:token/catalog/:type/:id.json', async (req, res) => {
    const data = await proxyService.proxyCatalog(req.params.token, req.params.type, req.params.id);
    if (!data) return res.status(502).json({ error: 'Proxy failed' });
    res.json(data);
  });

  router.get('/proxy/:token/meta/:type/:id.json', async (req, res) => {
    const data = await proxyService.proxyMeta(req.params.token, req.params.type, req.params.id);
    if (!data) return res.status(502).json({ error: 'Proxy failed' });
    res.json(data);
  });

  router.get('/proxy/:token/stream/:type/:id.json', async (req, res) => {
    const data = await proxyService.proxyStream(req.params.token, req.params.type, req.params.id);
    if (!data) return res.status(502).json({ error: 'Proxy failed' });
    res.json(data);
  });

  router.get('/proxy/:token/artwork', async (req, res) => {
    const url = req.query.url as string;
    const type = (req.query.type as string) || 'poster';
    const rating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;
    if (!url) return res.status(400).send('Missing url');
    const result = await proxyService.proxyArtwork(req.params.token, url, type, rating);
    if (!result) return res.status(502).send('Proxy failed');
    res.set('Content-Type', result.mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  });

  return router;
}
