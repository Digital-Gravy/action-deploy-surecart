import { downloadAsset } from '../src/lib/downloadAsset';
import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type Call = { url: string; init?: RequestInit };

function makeMockFetch(responseInit: { status?: number; body?: string }) {
  const calls: Call[] = [];
  const mockFetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = responseInit.body === undefined ? 'xyz' : responseInit.body;
    return new Response(body, { status: responseInit.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, mockFetch };
}

describe('downloadAsset', () => {
  const dest = join(tmpdir(), 'downloadAsset-fixture.bin');

  afterEach(() => {
    try {
      unlinkSync(dest);
    } catch {
      // ignore
    }
  });

  it('writes the response body to the destination path', async () => {
    const { mockFetch } = makeMockFetch({ body: 'Hello' });
    await downloadAsset('https://api.example.com/asset', 'tok', dest, mockFetch);
    expect(readFileSync(dest, 'utf8')).toBe('Hello');
  });

  it('sends Bearer Authorization and Accept: application/octet-stream', async () => {
    const { calls, mockFetch } = makeMockFetch({});
    await downloadAsset('https://api.example.com/asset', 'mytoken', dest, mockFetch);
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get('authorization')).toBe('Bearer mytoken');
    expect(headers.get('accept')).toBe('application/octet-stream');
  });

  it('throws on non-2xx', async () => {
    const { mockFetch } = makeMockFetch({ status: 404 });
    await expect(
      downloadAsset('https://api.example.com/asset', 'tok', dest, mockFetch)
    ).rejects.toThrow(/404/);
  });
});
