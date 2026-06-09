import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface StoredProxy {
  token: string;
  manifestUrl: string;
  rating: number;
  rewriteTypes: string[];
  badgeStyle: string;
  createdAt: string;
}

export class ProxyStore {
  private filePath: string;
  private cache: StoredProxy[] | null = null;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'proxies.json');
  }

  private load(): StoredProxy[] {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.cache = JSON.parse(raw);
        return this.cache!;
      }
    } catch {}
    this.cache = [];
    return this.cache;
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  createToken(): string {
    return crypto.randomBytes(6).toString('hex');
  }

  getAll(): StoredProxy[] {
    return this.load();
  }

  get(token: string): StoredProxy | undefined {
    return this.load().find(p => p.token === token);
  }

  create(data: Omit<StoredProxy, 'token' | 'createdAt'>): StoredProxy {
    const token = this.createToken();
    const entry: StoredProxy = {
      token,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.load().push(entry);
    this.save();
    return entry;
  }

  delete(token: string): boolean {
    const list = this.load();
    const idx = list.findIndex(p => p.token === token);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.save();
    return true;
  }
}
