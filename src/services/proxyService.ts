import axios from 'axios';
import { ProxyStore } from './proxyStore.js';
import { generateArtworkWithBadge } from './artworkService.js';

export class ProxyService {
  private store: ProxyStore;
  private baseUrl: string;

  constructor(store: ProxyStore, baseUrl: string) {
    this.store = store;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async createProxy(manifestUrl: string, rating: number, rewriteTypes: string[], badgeStyle: string) {
    const entry = this.store.create({ manifestUrl, rating, rewriteTypes, badgeStyle });
    return {
      token: entry.token,
      manifestUrl: `${this.baseUrl}/proxy/${entry.token}/manifest.json`,
      createdAt: entry.createdAt,
    };
  }

  async getManifest(token: string): Promise<any | null> {
    const config = this.store.get(token);
    if (!config) return null;
    try {
      const { data: manifest } = await axios.get(config.manifestUrl, { timeout: 15000 });
      return this.rewriteManifest(manifest, config);
    } catch { return null; }
  }

  private rewriteManifest(manifest: any, config: StoredProxy): any {
    const m = JSON.parse(JSON.stringify(manifest));
    m.id = `easy-ratings-proxy-${config.token}`;
    m.name = `${m.name || 'Proxy'} [ERDB]`;
    if (!m.description) m.description = '';
    m.description += ` Rating: ${config.rating.toFixed(1)}`;
    if (m.catalogs) {
      m.catalogs = m.catalogs.map((cat: any) => ({
        ...cat,
        extra: [...(cat.extra || []), { name: 'search', isRequired: false }],
      }));
    }
    return m;
  }

  async proxyCatalog(token: string, type: string, id: string): Promise<any | null> {
    const config = this.store.get(token);
    if (!config) return null;
    try {
      const base = config.manifestUrl.replace(/\/manifest\.json$/, '');
      const { data } = await axios.get(`${base}/catalog/${type}/${id}.json`, { timeout: 15000 });
      return this.rewriteMetaItems(data, config);
    } catch { return null; }
  }

  async proxyMeta(token: string, type: string, id: string): Promise<any | null> {
    const config = this.store.get(token);
    if (!config) return null;
    try {
      const base = config.manifestUrl.replace(/\/manifest\.json$/, '');
      const { data } = await axios.get(`${base}/meta/${type}/${id}.json`, { timeout: 15000 });
      return this.rewriteMetaItem(data, config);
    } catch { return null; }
  }

  async proxyStream(token: string, type: string, id: string): Promise<any | null> {
    const config = this.store.get(token);
    if (!config) return null;
    try {
      const base = config.manifestUrl.replace(/\/manifest\.json$/, '');
      const { data } = await axios.get(`${base}/stream/${type}/${id}.json`, { timeout: 15000 });
      return data;
    } catch { return null; }
  }

  private rewriteMetaItems(data: any, config: StoredProxy): any {
    if (!data) return data;
    const result = { ...data };
    const proxyBase = `${this.baseUrl}/proxy/${config.token}`;
    const types = config.rewriteTypes;
    if (result.metas && Array.isArray(result.metas)) {
      result.metas = result.metas.map((meta: any) => {
        const m = { ...meta };
        if (types.includes('poster') && m.poster)
          m.poster = `${proxyBase}/artwork?url=${encodeURIComponent(m.poster)}&type=poster&rating=${config.rating}`;
        if ((types.includes('background') || types.includes('backdrop')) && m.background)
          m.background = `${proxyBase}/artwork?url=${encodeURIComponent(m.background)}&type=backdrop&rating=${config.rating}`;
        if (types.includes('logo') && m.logo)
          m.logo = `${proxyBase}/artwork?url=${encodeURIComponent(m.logo)}&type=logo&rating=${config.rating}`;
        return m;
      });
    }
    return result;
  }

  private rewriteMetaItem(data: any, config: StoredProxy): any {
    if (!data?.meta) return data;
    const result = JSON.parse(JSON.stringify(data));
    const proxyBase = `${this.baseUrl}/proxy/${config.token}`;
    const types = config.rewriteTypes;
    const m = result.meta;
    if (types.includes('poster') && m.poster)
      m.poster = `${proxyBase}/artwork?url=${encodeURIComponent(m.poster)}&type=poster&rating=${config.rating}`;
    if ((types.includes('background') || types.includes('backdrop')) && m.background)
      m.background = `${proxyBase}/artwork?url=${encodeURIComponent(m.background)}&type=backdrop&rating=${config.rating}`;
    if (types.includes('logo') && m.logo)
      m.logo = `${proxyBase}/artwork?url=${encodeURIComponent(m.logo)}&type=logo&rating=${config.rating}`;
    return result;
  }

  async proxyArtwork(token: string, imageUrl: string, type: string, rating?: number): Promise<{ buffer: Buffer; mime: string } | null> {
    const config = this.store.get(token);
    if (!config) return null;
    const finalRating = rating ?? config.rating;
    try {
      const { data: raw } = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const sizes: Record<string, { w: number; h: number }> = {
        poster: { w: 300, h: 450 },
        backdrop: { w: 1280, h: 720 },
        logo: { w: 400, h: 200 },
        thumbnail: { w: 92, h: 138 },
      };
      const dim = sizes[type] || sizes.poster;
      const buf = await generateArtworkWithBadge({
        imageBuffer: Buffer.from(raw),
        rating: finalRating,
        width: dim.w,
        height: dim.h,
        badgeStyle: config.badgeStyle,
      });
      return { buffer: buf, mime: 'image/png' };
    } catch { return null; }
  }

  list() {
    return this.store.getAll().map(p => ({
      token: p.token,
      manifestUrl: p.manifestUrl,
      rating: p.rating,
      rewriteTypes: p.rewriteTypes,
      badgeStyle: p.badgeStyle,
      createdAt: p.createdAt,
    }));
  }

  delete(token: string) {
    return this.store.delete(token);
  }
}

interface StoredProxy {
  token: string;
  manifestUrl: string;
  rating: number;
  rewriteTypes: string[];
  badgeStyle: string;
  createdAt: string;
}
