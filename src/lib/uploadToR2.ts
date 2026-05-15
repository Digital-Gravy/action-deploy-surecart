import { createReadStream, statSync } from 'node:fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type R2Uploader = Pick<S3Client, 'send'>;

export type UploadToR2Params = {
  bucket: string;
  key: string;
  localPath: string;
  contentType?: string;
  client: R2Uploader;
};

export async function uploadToR2(params: UploadToR2Params): Promise<void> {
  const { size } = statSync(params.localPath);
  const cmd = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    Body: createReadStream(params.localPath),
    ContentType: params.contentType ?? 'application/zip',
    ContentLength: size,
  });
  await params.client.send(cmd as never);
}

export function createR2Client(opts: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
  });
}
