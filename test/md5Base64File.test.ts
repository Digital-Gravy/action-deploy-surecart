import { md5Base64File } from '../src/lib/md5Base64File';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';

describe('md5Base64File', () => {
  const fixture = join(tmpdir(), 'md5Base64File-fixture.bin');
  const big = join(tmpdir(), 'md5Base64File-big.bin');

  beforeAll(() => {
    writeFileSync(fixture, 'hello world');
  });

  afterAll(() => {
    for (const f of [fixture, big]) {
      try {
        unlinkSync(f);
      } catch {
        // ignore
      }
    }
  });

  it('returns the base64-encoded raw MD5 digest (ActiveStorage checksum format)', async () => {
    // md5("hello world") raw digest, base64-encoded
    await expect(md5Base64File(fixture)).resolves.toBe('XrY7u+Ae7tCTyyK7j1rNww==');
  });

  it('returns base64 (not hex) — distinct from a hex digest', async () => {
    const result = await md5Base64File(fixture);
    expect(result).not.toMatch(/^[0-9a-f]{32}$/);
    expect(result).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it('streams a large file and matches a one-shot digest', async () => {
    const buf = randomBytes(5 * 1024 * 1024); // 5 MB, exceeds a single chunk
    writeFileSync(big, buf);
    const expected = createHash('md5').update(buf).digest('base64');
    await expect(md5Base64File(big)).resolves.toBe(expected);
  });
});
