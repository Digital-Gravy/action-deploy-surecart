import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Streamed MD5 of a file, base64-encoded — the checksum format the SureCart
 * direct-upload expects for a blob (Content-MD5 on the presigned PUT).
 * Distinct from hashFile, which returns a hex sha256.
 */
export async function md5Base64File(path: string): Promise<string> {
  const hash = createHash('md5');
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('base64');
}
