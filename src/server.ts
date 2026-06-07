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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/logo.png', (_req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0ea5e9"/><text x="64" y="80" fill="#fff" font-size="64" font-weight="bold" font-family="Arial" text-anchor="middle">i</text></svg>`);
});
app.get('/manifest.json', (_req, res) => res.json(getManifest()));
app.get('/:configId/manifest.json', (req, res) => res.json(getManifest(req.params.configId)));
app.get('/:configId/catalog/:type/:id/:extra?.json', async (req, res) => {
  try { res.json(await catalogHandler(req.params.configId, req.params.id)); }
  catch (error) { logger.error({ error }, 'Catalog error'); res.status(500).json({ metas: [] }); }
});
app.get('/:configId/meta/:type/:id.json', async (req, res) => {
  try { res.json(await metaHandler(req.params.configId, req.params.id)); }
  catch (error) { logger.error({ error }, 'Meta error'); res.status(500).json({ meta: null }); }
});
app.get('/configure/:configId?', (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.use(routes);
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => { logger.info({ port: PORT }, 'Server started'); startCron(); });
