import { findReleaseAssets } from '../src/lib/findReleaseAssets';

type Call = { url: string; init?: RequestInit };

function recorder(responses: Array<{ status?: number; body: string }>) {
  const calls: Call[] = [];
  let i = 0;
  const mockFetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses[i++] ?? responses[responses.length - 1];
    return new Response(r.body, { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, mockFetch };
}

describe('findReleaseAssets', () => {
  it('GETs /repos/<repo>/releases/tags/<tag>', async () => {
    const body = JSON.stringify({
      assets: [{ name: 'a.zip', url: 'https://api.github.com/.../a', size: 100 }],
    });
    const { calls, mockFetch } = recorder([{ body }]);
    await findReleaseAssets('v1', 'owner/repo', 'tok', '*.zip', mockFetch);
    expect(calls[0].url).toBe('https://api.github.com/repos/owner/repo/releases/tags/v1');
  });

  it('returns assets matching the glob pattern', async () => {
    const body = JSON.stringify({
      assets: [
        { name: 'etch-1.4.18.zip', url: 'u1', size: 100 },
        { name: 'etch-theme-0.0.7.zip', url: 'u2', size: 50 },
      ],
    });
    const { mockFetch } = recorder([{ body }]);
    const results = await findReleaseAssets('v1', 'o/r', 'tok', 'etch-[0-9]*.zip', mockFetch);
    expect(results).toEqual([{ name: 'etch-1.4.18.zip', downloadUrl: 'u1', size: 100 }]);
  });

  it('throws when no assets match the pattern', async () => {
    const body = JSON.stringify({
      assets: [{ name: 'source.tar.gz', url: 'u', size: 10 }],
    });
    const { mockFetch } = recorder([{ body }]);
    await expect(findReleaseAssets('v1', 'o/r', 'tok', '*.zip', mockFetch)).rejects.toThrow(
      /No release assets/
    );
  });

  it('throws when GitHub returns non-2xx', async () => {
    const { mockFetch } = recorder([{ status: 404, body: 'nf' }]);
    await expect(findReleaseAssets('v1', 'o/r', 'tok', '*.zip', mockFetch)).rejects.toThrow(/404/);
  });

  it('sends Bearer Authorization header', async () => {
    const body = JSON.stringify({
      assets: [{ name: 'a.zip', url: 'u', size: 1 }],
    });
    const { calls, mockFetch } = recorder([{ body }]);
    await findReleaseAssets('v1', 'o/r', 'tok', '*.zip', mockFetch);
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer tok');
  });
});
