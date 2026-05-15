import { S3Client } from '@aws-sdk/client-s3';
export type R2Uploader = Pick<S3Client, 'send'>;
export type UploadToR2Params = {
    bucket: string;
    key: string;
    localPath: string;
    contentType?: string;
    client: R2Uploader;
};
export declare function uploadToR2(params: UploadToR2Params): Promise<void>;
export declare function createR2Client(opts: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
}): S3Client;
