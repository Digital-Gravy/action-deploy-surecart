import { hashFile } from '../src/lib/hashFile';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('hashFile', () => {
  const fixture = join(tmpdir(), 'hashFile-fixture.bin');

  beforeAll(() => {
    writeFileSync(fixture, 'hello world');
  });

  afterAll(() => {
    try {
      unlinkSync(fixture);
    } catch {
      // ignore
    }
  });

  it('returns the first 16 hex chars of the sha256 by default', async () => {
    // sha256("hello world") = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
    await expect(hashFile(fixture)).resolves.toBe('b94d27b9934d3e08');
  });

  it('returns the requested prefix length', async () => {
    await expect(hashFile(fixture, 8)).resolves.toBe('b94d27b9');
  });

  it('returns the full sha256 when prefixLength is 64', async () => {
    await expect(hashFile(fixture, 64)).resolves.toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    );
  });
});
