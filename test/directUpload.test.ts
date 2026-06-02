import { directUpload } from '../src/lib/directUpload';

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
  filename: 'plugin-1.2.3.zip',
  contentType: 'application/zip',
  byteSize: 55949,
  checksum: 'XrY7u+Ae7tCTyyK7j1rNww==',
  apiToken: 'sk_test',
};

const okBody = JSON.stringify({
  id: 'blob_1',
  signed_id: 'signed_abc',
  direct_upload: {
    url: 'https://surecart-production.s3-accelerate.amazonaws.com/key?X-Amz-Signature=xyz',
    headers: { 'Content-Type': 'application/zip', 'Content-MD5': 'XrY7u+Ae7tCTyyK7j1rNww==' },
  },
});

describe('directUpload', () => {
  it('POSTs to /v1/direct_upload/private with the blob metadata', async () => {
    const { calls, mockFetch } = recorder([{ body: okBody }]);
    await directUpload({ ...base, fetcher: mockFetch });
    expect(calls[0].url).toBe('https://api.surecart.com/v1/direct_upload/private');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      blob: {
        filename: 'plugin-1.2.3.zip',
        content_type: 'application/zip',
        byte_size: 55949,
        checksum: 'XrY7u+Ae7tCTyyK7j1rNww==',
      },
    });
  });

  it('sends Bearer Authorization with the api token', async () => {
    const { calls, mockFetch } = recorder([{ body: okBody }]);
    await directUpload({ ...base, fetcher: mockFetch });
    expect(new Headers(calls[0].init?.headers).get('authorization')).toBe('Bearer sk_test');
  });

  it('returns signedId, uploadUrl and the presigned PUT headers', async () => {
    const { mockFetch } = recorder([{ body: okBody }]);
    await expect(directUpload({ ...base, fetcher: mockFetch })).resolves.toEqual({
      signedId: 'signed_abc',
      uploadUrl: 'https://surecart-production.s3-accelerate.amazonaws.com/key?X-Amz-Signature=xyz',
      headers: { 'Content-Type': 'application/zip', 'Content-MD5': 'XrY7u+Ae7tCTyyK7j1rNww==' },
    });
  });

  it('throws on a non-2xx response, including the status', async () => {
    const { mockFetch } = recorder([{ status: 422, body: '{"message":"bad checksum"}' }]);
    await expect(directUpload({ ...base, fetcher: mockFetch })).rejects.toThrow(/422/);
  });
});
