import { extname, basename } from 'node:path';

export function buildObjectKey(prefix: string, assetName: string, sha: string): string {
  const ext = extname(assetName);
  const base = basename(assetName, ext);
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  return `${cleanPrefix}/${base}-${sha}${ext}`;
}
