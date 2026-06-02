import { readFile } from 'node:fs/promises';

export type PutToStorageParams = {
  uploadUrl: string;
  headers: Record<string, string>;
  localPath: string;
  fetcher?: typeof fetch;
};

/**
 * PUT a local file to a presigned storage URL. The headers MUST be the ones
 * returned by directUpload (Content-Type, Content-MD5) — S3 signs them, so
 * any mismatch or omission is rejected with a signature error.
 */
export async function putToStorage(params: PutToStorageParams): Promise<void> {
  const fetcher = params.fetcher ?? fetch;
  const body = await readFile(params.localPath);
  const res = await fetcher(params.uploadUrl, {
    method: 'PUT',
    headers: params.headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage PUT to presigned URL returned ${res.status}: ${text}`);
  }
}
