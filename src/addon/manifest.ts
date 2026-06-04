import { toManifest } from '../utils/mapper.js';
export function getManifest() {
  return toManifest(process.env.BASE_URL || 'http://localhost:3000');
}
