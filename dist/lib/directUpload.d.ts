export type DirectUploadParams = {
    filename: string;
    contentType: string;
    byteSize: number;
    checksum: string;
    apiToken: string;
    fetcher?: typeof fetch;
};
export type DirectUploadResult = {
    signedId: string;
    uploadUrl: string;
    headers: Record<string, string>;
};
/**
 * Reserve a direct-upload blob on SureCart. Returns a presigned PUT URL + the
 * exact headers that PUT must carry, plus the signed_id used later to attach
 * the uploaded blob to a Media record.
 */
export declare function directUpload(params: DirectUploadParams): Promise<DirectUploadResult>;
