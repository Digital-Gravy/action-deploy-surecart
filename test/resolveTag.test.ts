import { resolveTag } from '../src/lib/resolveTag';

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

describe('resolveTag', () => {
  it('returns the input unchanged when it is not "latest"', async () => {
    const { calls, mockFetch } = recorder([{ body: '{}' }]);
    await expect(resolveTag('1.4.19', 'a/b', 'tok', mockFetch)).resolves.toBe('1.4.19');
    expect(calls).toHaveLength(0);
  });

  it('fetches /releases/latest and returns its tag_name when input is "latest"', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"tag_name":"1.4.20"}' }]);
    await expect(resolveTag('latest', 'a/b', 'tok', mockFetch)).resolves.toBe('1.4.20');
    expect(calls[0].url).toBe('https://api.github.com/repos/a/b/releases/latest');
  });

  it('throws when the latest lookup returns non-2xx', async () => {
    const { mockFetch } = recorder([{ status: 404, body: 'nf' }]);
    await expect(resolveTag('latest', 'a/b', 'tok', mockFetch)).rejects.toThrow(/404/);
  });
});
