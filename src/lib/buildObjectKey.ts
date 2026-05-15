export function buildObjectKey(prefix: string, assetName: string, sha: string): string {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
  return `${cleanPrefix}/${sha}/${assetName}`;
}
