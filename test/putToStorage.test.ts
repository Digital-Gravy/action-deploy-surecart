import { putToStorage } from '../src/lib/putToStorage';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type Call = { url: string; init?: RequestInit };

function recorder(responses: Array<{ status?: number; body?: string }>) {
  const calls: Call[] = [];
  let i = 0;
  const mockFetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses[i++] ?? responses[responses.length - 1];
    return new Response(r.body ?? '', { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, mockFetch };
}

describe('putToStorage', () => {
  const fixture = join(tmpdir(), 'putToStorage-fixture.zip');
  const uploadUrl = 'https://surecart-production.s3-accelerate.amazonaws.com/key?X-Amz-Signature=x';
  const headers = { 'Content-Type': 'application/zip', 'Content-MD5': 'XrY7u+Ae7tCTyyK7j1rNww==' };

  beforeAll(() => {
    writeFileSync(fixture, 'PK fake zip bytes');
  });

  afterAll(() => {
    try {
      unlinkSync(fixture);
    } catch {
      // ignore
    }
  });

  it('PUTs to the presigned URL', async () => {
    const { calls, mockFetch } = recorder([{ status: 200 }]);
    await putToStorage({ uploadUrl, headers, localPath: fixture, fetcher: mockFetch });
    expect(calls[0].url).toBe(uploadUrl);
    expect(calls[0].init?.method).toBe('PUT');
  });

  it('forwards the presigned headers verbatim', async () => {
    const { calls, mockFetch } = recorder([{ status: 200 }]);
    await putToStorage({ uploadUrl, headers, localPath: fixture, fetcher: mockFetch });
    const sent = new Headers(calls[0].init?.headers);
    expect(sent.get('content-type')).toBe('application/zip');
    expect(sent.get('content-md5')).toBe('XrY7u+Ae7tCTyyK7j1rNww==');
  });

  it('sends the file bytes as the request body', async () => {
    const { calls, mockFetch } = recorder([{ status: 200 }]);
    await putToStorage({ uploadUrl, headers, localPath: fixture, fetcher: mockFetch });
    const body = calls[0].init?.body as Buffer;
    expect(Buffer.from(body).toString()).toBe('PK fake zip bytes');
  });

  it('throws on a non-2xx response, including the status', async () => {
    const { mockFetch } = recorder([{ status: 403, body: 'SignatureDoesNotMatch' }]);
    await expect(
      putToStorage({ uploadUrl, headers, localPath: fixture, fetcher: mockFetch })
    ).rejects.toThrow(/403/);
  });
});
