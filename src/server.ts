import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './api/routes.js';
import { getManifest } from './addon/manifest.js';
import { catalogHandler, metaHandler } from './addon/handlers.js';
import { startCron } from './jobs/cron.js';
import { logger } from './utils/logger.js';
import * as poster from './api/poster.js';
import { artworkRoutes } from './api/artwork.js';
import { ImageCache } from './services/imageCache.js';
import { ProxyStore } from './services/proxyStore.js';
import { ProxyService } from './services/proxyService.js';
import fs from 'fs';
import { resolveConfigId, checkTables } from './services/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/logo.png', async (_req, res) => {
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>
  <rect width="256" height="256" rx="48" fill="url(#g)"/>
  <rect x="8" y="8" width="240" height="240" rx="44" fill="none" stroke="#ffffff30" stroke-width="2"/>
  <g transform="translate(128,128)"><polygon points="-40,-60 40,-60 0,60" fill="#ffffff" opacity="0.95"/><polygon points="-20,-30 20,-30 0,30" fill="#0ea5e9"/></g>
  <circle cx="188" cy="68" r="24" fill="#fbbf24" opacity="0.9"/>
  <text x="188" y="76" fill="#020617" font-size="22" font-weight="900" font-family="Arial" text-anchor="middle">i</text>
</svg>`;
  try {
    const sharp = (await import('sharp')).default;
    const png = await sharp(Buffer.from(logo)).resize(256, 256).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(png);
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(logo);
  }
});
app.get('/poster/:configId/:cardId.png', poster.posterHandler);
app.options('/poster/:configId/:cardId.png', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(204).end();
});
app.get('/vposter/:configId/:cardId/:vIdx.png', poster.videoPosterHandler);
app.options('/vposter/:configId/:cardId/:vIdx.png', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(204).end();
});
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const imageCache = new ImageCache(dataDir);
const proxyStore = new ProxyStore(dataDir);
const proxyService = new ProxyService(proxyStore, process.env.BASE_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`);

app.use(artworkRoutes(imageCache, proxyService));

app.get('/manifest.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(getManifest());
});

app.get('/:configId/manifest.json', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ error: 'Config not found' });
  res.json(getManifest(uuid, req.params.configId));
});

app.get('/:configId/catalog/:type/:id.json', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ metas: [] });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try { res.json(await catalogHandler(uuid, req.params.id, baseUrl)); }
  catch (error) { logger.error({ error }, 'Catalog error'); res.status(500).json({ metas: [] }); }
});

app.get('/:configId/meta/:type/:id.json', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const uuid = await resolveConfigId(req.params.configId);
  if (!uuid) return res.status(404).json({ meta: null });
  try { res.json(await metaHandler(uuid, req.params.id)); }
  catch (error) { logger.error({ error }, 'Meta error'); res.status(500).json({ meta: null }); }
});

app.get('/artwork', (req, res) => res.sendFile(path.join(__dirname, '../public/artwork.html')));
app.get('/proxy', (req, res) => res.sendFile(path.join(__dirname, '../public/proxy.html')));
app.get('/configure/:configId?', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/:configId/configure', (req, res) => res.redirect(`/configure/${req.params.configId}`));
app.use(routes);

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', async () => {
  logger.info({ port: PORT }, 'Server started');
  const tablesOk = await checkTables();
  if (!tablesOk) {
    logger.warn('Tabelle DB mancanti! Esegui supabase/init.sql nel Supabase SQL Editor.');
  }
  startCron();
});
