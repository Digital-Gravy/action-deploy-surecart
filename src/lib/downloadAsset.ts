import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function downloadAsset(
  assetUrl: string,
  token: string,
  destPath: string,
  fetcher: typeof fetch = fetch
): Promise<void> {
  const res = await fetcher(assetUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/octet-stream',
    },
  });
  if (!res.ok) {
    throw new Error(`Asset download from ${assetUrl} returned ${res.status}`);
  }
  if (!res.body) {
    throw new Error(`Asset download from ${assetUrl} returned no body`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(destPath));
}
