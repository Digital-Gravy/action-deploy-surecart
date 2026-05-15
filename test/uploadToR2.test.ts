import { uploadToR2 } from '../src/lib/uploadToR2';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PutObjectCommand } from '@aws-sdk/client-s3';

describe('uploadToR2', () => {
  // Unique filename so prior runs don't conflict. Not unlinked — tmpdir is OS-managed and
  // unlinking races with the lazy createReadStream used by PutObjectCommand.
  const localPath = join(tmpdir(), `uploadToR2-${Date.now()}-${process.pid}.bin`);

  beforeAll(() => {
    writeFileSync(localPath, 'test content');
  });

  it('sends a PutObjectCommand with Bucket, Key, ContentType, and ContentLength', async () => {
    const send = jest.fn().mockImplementation(async (cmd) => {
      // Drain body stream so file handle closes before afterAll unlinks
      const body = cmd.input?.Body;
      if (body && typeof body[Symbol.asyncIterator] === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of body) {
          // drain
        }
      }
      return {};
    });
    await uploadToR2({
      bucket: 'my-bucket',
      key: 'etch/a-abc.zip',
      localPath,
      client: { send } as never,
    });
    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Bucket).toBe('my-bucket');
    expect(cmd.input.Key).toBe('etch/a-abc.zip');
    expect(cmd.input.ContentType).toBe('application/zip');
    expect(cmd.input.ContentLength).toBe(12);
  });

  it('honors a custom ContentType', async () => {
    const send = jest.fn().mockImplementation(async (cmd) => {
      // Drain body stream so file handle closes before afterAll unlinks
      const body = cmd.input?.Body;
      if (body && typeof body[Symbol.asyncIterator] === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of body) {
          // drain
        }
      }
      return {};
    });
    await uploadToR2({
      bucket: 'b',
      key: 'k',
      localPath,
      contentType: 'application/octet-stream',
      client: { send } as never,
    });
    const cmd = send.mock.calls[0][0] as PutObjectCommand;
    expect(cmd.input.ContentType).toBe('application/octet-stream');
  });

  it('propagates SDK errors', async () => {
    const send = jest.fn().mockImplementation(async (cmd) => {
      cmd.input?.Body?.destroy?.();
      throw new Error('Network unreachable');
    });
    await expect(
      uploadToR2({
        bucket: 'b',
        key: 'k',
        localPath,
        client: { send } as never,
      })
    ).rejects.toThrow(/Network unreachable/);
  });
});
