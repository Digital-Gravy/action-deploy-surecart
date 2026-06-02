import { pollMediaRelease } from '../src/lib/pollMediaRelease';

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

const noSleep = async () => {};
const withVersion = JSON.stringify({ id: 'med_1', release_json: { version: '0.1.15' } });
const noVersion = JSON.stringify({ id: 'med_1', release_json: null });

const base = {
  mediaId: 'med_1',
  apiToken: 'sk_test',
  timeoutSeconds: 10,
  intervalSeconds: 2,
  sleep: noSleep,
};

describe('pollMediaRelease', () => {
  it('GETs /v1/medias/<id> with Bearer auth', async () => {
    const { calls, mockFetch } = recorder([{ body: withVersion }]);
    await pollMediaRelease({ ...base, fetcher: mockFetch });
    expect(calls[0].url).toBe('https://api.surecart.com/v1/medias/med_1');
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer sk_test');
  });

  it('returns the releaseJson immediately when version is already present', async () => {
    const { calls, mockFetch } = recorder([{ body: withVersion }]);
    await expect(pollMediaRelease({ ...base, fetcher: mockFetch })).resolves.toEqual({
      version: '0.1.15',
    });
    expect(calls.length).toBe(1);
  });

  it('keeps polling until the version appears, then returns it', async () => {
    const { calls, mockFetch } = recorder([
      { body: noVersion },
      { body: noVersion },
      { body: withVersion },
    ]);
    await expect(pollMediaRelease({ ...base, fetcher: mockFetch })).resolves.toEqual({
      version: '0.1.15',
    });
    expect(calls.length).toBe(3);
  });

  it('throws when the version never appears within the timeout (fail loud)', async () => {
    // timeout 4s / interval 2s => 3 attempts, all null
    const { calls, mockFetch } = recorder([{ body: noVersion }]);
    await expect(
      pollMediaRelease({ ...base, timeoutSeconds: 4, intervalSeconds: 2, fetcher: mockFetch })
    ).rejects.toThrow(/release_json.*version|version.*med_1|timed out/i);
    expect(calls.length).toBe(3);
  });

  it('throws on a non-2xx response, including the status', async () => {
    const { mockFetch } = recorder([{ status: 404, body: '{"message":"not found"}' }]);
    await expect(pollMediaRelease({ ...base, fetcher: mockFetch })).rejects.toThrow(/404/);
  });
});
