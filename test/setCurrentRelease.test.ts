import { setCurrentRelease } from '../src/lib/setCurrentRelease';

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

const base = {
  productUuid: 'prod_test',
  downloadId: 'dl_new',
  apiToken: 'sk_test',
};

describe('setCurrentRelease', () => {
  it('PATCHes /v1/products/<uuid> with product.current_release_download', async () => {
    const { calls, mockFetch } = recorder([
      { body: '{"id":"prod_test","current_release_download":"dl_new"}' },
    ]);
    await setCurrentRelease({ ...base, fetcher: mockFetch });
    expect(calls[0].url).toBe('https://api.surecart.com/v1/products/prod_test');
    expect(calls[0].init?.method).toBe('PATCH');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      product: { current_release_download: 'dl_new' },
    });
  });

  it('sends Bearer Authorization with the api token', async () => {
    const { calls, mockFetch } = recorder([
      { body: '{"id":"x","current_release_download":"dl_new"}' },
    ]);
    await setCurrentRelease({ ...base, fetcher: mockFetch });
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer sk_test');
  });

  it('resolves cleanly on 200 with current_release_download set', async () => {
    const { mockFetch } = recorder([
      { body: '{"id":"x","current_release_download":"dl_new"}' },
    ]);
    await expect(setCurrentRelease({ ...base, fetcher: mockFetch })).resolves.toBeUndefined();
  });

  it('throws when API succeeds but current_release_download is null in response', async () => {
    const { mockFetch } = recorder([{ body: '{"id":"x","current_release_download":null}' }]);
    await expect(setCurrentRelease({ ...base, fetcher: mockFetch })).rejects.toThrow(
      /current_release_download/
    );
  });

  it('throws when the API returns a non-2xx status', async () => {
    const { mockFetch } = recorder([{ status: 404, body: '{"message":"not found"}' }]);
    await expect(setCurrentRelease({ ...base, fetcher: mockFetch })).rejects.toThrow(/404/);
  });
});
