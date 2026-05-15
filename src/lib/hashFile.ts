import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export async function hashFile(path: string, prefixLength = 16): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex').slice(0, prefixLength);
}
