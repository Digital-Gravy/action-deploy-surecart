import { createDownload } from '../src/lib/createDownload';

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
  apiToken: 'sk_test',
  behavior: 'warn' as const,
};

describe('createDownload (v1 mode — mediaId)', () => {
  it('POSTs to /v1/downloads with download.media_id', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"id":"dl_new"}', status: 201 }]);
    await createDownload({ ...base, mediaId: 'med_abc', fetcher: mockFetch });
    expect(calls[0].url).toBe('https://api.surecart.com/v1/downloads');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      download: { product: 'prod_test', media_id: 'med_abc' },
    });
  });

  it('returns the new download id and isDuplicate=false on 201', async () => {
    const { mockFetch } = recorder([{ body: '{"id":"dl_new123"}', status: 201 }]);
    await expect(
      createDownload({ ...base, mediaId: 'med_abc', fetcher: mockFetch })
    ).resolves.toEqual({ id: 'dl_new123', isDuplicate: false });
  });

  it('sends Bearer Authorization with the api token', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"id":"dl_x"}', status: 201 }]);
    await createDownload({ ...base, mediaId: 'med_abc', fetcher: mockFetch });
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer sk_test');
  });
});

describe('createDownload (v2 mode — externalUrl)', () => {
  it('POSTs with download.url, download.name, download.enabled instead of media_id', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"id":"dl_x"}', status: 201 }]);
    await createDownload({
      ...base,
      externalUrl: 'https://dl.example.com/a.zip',
      name: 'a',
      fetcher: mockFetch,
    });
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      download: {
        product: 'prod_test',
        url: 'https://dl.example.com/a.zip',
        name: 'a',
        enabled: true,
      },
    });
  });
});

describe('createDownload (duplicate handling)', () => {
  it('returns existing id with isDuplicate=true on 422 duplicate with behavior=warn', async () => {
    const body = JSON.stringify({
      validation_errors: [{ message: 'Media has already been taken', download_id: 'dl_existing' }],
    });
    const { mockFetch } = recorder([{ body, status: 422 }]);
    await expect(
      createDownload({ ...base, mediaId: 'med_dup', fetcher: mockFetch })
    ).resolves.toEqual({ id: 'dl_existing', isDuplicate: true });
  });

  it('returns null id with isDuplicate=true on duplicate without download_id (warn)', async () => {
    const body = JSON.stringify({
      validation_errors: [{ message: 'Url has already been taken' }],
    });
    const { mockFetch } = recorder([{ body, status: 422 }]);
    await expect(
      createDownload({
        ...base,
        externalUrl: 'https://x',
        name: 'x',
        fetcher: mockFetch,
      })
    ).resolves.toEqual({ id: null, isDuplicate: true });
  });

  it('throws on 422 duplicate when behavior=error', async () => {
    const body = JSON.stringify({
      validation_errors: [{ message: 'Media has already been taken' }],
    });
    const { mockFetch } = recorder([{ body, status: 422 }]);
    await expect(
      createDownload({
        ...base,
        behavior: 'error',
        mediaId: 'med_dup',
        fetcher: mockFetch,
      })
    ).rejects.toThrow(/already been taken/);
  });

  it('throws on 422 non-duplicate validation error', async () => {
    const body = JSON.stringify({
      validation_errors: [{ message: "Url can't be blank" }],
    });
    const { mockFetch } = recorder([{ body, status: 422 }]);
    await expect(
      createDownload({
        ...base,
        externalUrl: '',
        name: 'x',
        fetcher: mockFetch,
      })
    ).rejects.toThrow(/422/);
  });

  it('throws on 5xx server error', async () => {
    const { mockFetch } = recorder([{ body: 'boom', status: 500 }]);
    await expect(createDownload({ ...base, mediaId: 'med_x', fetcher: mockFetch })).rejects.toThrow(
      /500/
    );
  });
});
