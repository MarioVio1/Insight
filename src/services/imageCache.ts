import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_TTL = 86400000;

export class ImageCache {
  private dir: string;

  constructor(dataDir: string) {
    this.dir = path.join(dataDir, 'cache');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  private keyPath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.dir, `${hash}.dat`);
  }

  get(key: string): Buffer | null {
    const fp = this.keyPath(key);
    if (!fs.existsSync(fp)) return null;
    const stats = fs.statSync(fp);
    if (Date.now() - stats.mtimeMs > CACHE_TTL) {
      fs.unlinkSync(fp);
      return null;
    }
    return fs.readFileSync(fp);
  }

  set(key: string, data: Buffer): string {
    const fp = this.keyPath(key);
    fs.writeFileSync(fp, data);
    return fp;
  }

  clear(): void {
    const files = fs.readdirSync(this.dir);
    for (const f of files) {
      fs.unlinkSync(path.join(this.dir, f));
    }
  }
}
