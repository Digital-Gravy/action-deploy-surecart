export type PutToStorageParams = {
    uploadUrl: string;
    headers: Record<string, string>;
    localPath: string;
    fetcher?: typeof fetch;
};
/**
 * PUT a local file to a presigned storage URL. The headers MUST be the ones
 * returned by directUpload (Content-Type, Content-MD5) — S3 signs them, so
 * any mismatch or omission is rejected with a signature error.
 */
export declare function putToStorage(params: PutToStorageParams): Promise<void>;
