export function buildPublicUrl(baseUrl: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${base}/${cleanKey}`;
}
