import { createMedia } from '../src/lib/createMedia';

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

const base = { signedId: 'signed_abc', apiToken: 'sk_test' };

describe('createMedia', () => {
  it('POSTs to /v1/medias with media.direct_upload_signed_id', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"id":"med_1","release_json":null}' }]);
    await createMedia({ ...base, fetcher: mockFetch });
    expect(calls[0].url).toBe('https://api.surecart.com/v1/medias');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      media: { direct_upload_signed_id: 'signed_abc' },
    });
  });

  it('sends Bearer Authorization with the api token', async () => {
    const { calls, mockFetch } = recorder([{ body: '{"id":"med_1","release_json":null}' }]);
    await createMedia({ ...base, fetcher: mockFetch });
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer sk_test');
  });

  it('returns the media id and releaseJson (null right after create, ingest is async)', async () => {
    const { mockFetch } = recorder([{ body: '{"id":"med_xyz","release_json":null}' }]);
    await expect(createMedia({ ...base, fetcher: mockFetch })).resolves.toEqual({
      id: 'med_xyz',
      releaseJson: null,
    });
  });

  it('returns a populated releaseJson when present', async () => {
    const body = JSON.stringify({
      id: 'med_xyz',
      release_json: { slug: 'devops-playground', version: '0.1.15' },
    });
    const { mockFetch } = recorder([{ body }]);
    await expect(createMedia({ ...base, fetcher: mockFetch })).resolves.toEqual({
      id: 'med_xyz',
      releaseJson: { slug: 'devops-playground', version: '0.1.15' },
    });
  });

  it('throws on a non-2xx response, including the status', async () => {
    const { mockFetch } = recorder([{ status: 422, body: '{"message":"invalid signed id"}' }]);
    await expect(createMedia({ ...base, fetcher: mockFetch })).rejects.toThrow(/422/);
  });
});
