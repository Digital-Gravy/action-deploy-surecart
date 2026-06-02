/**
 * Streamed MD5 of a file, base64-encoded — the checksum format the SureCart
 * direct-upload expects for a blob (Content-MD5 on the presigned PUT).
 * Distinct from hashFile, which returns a hex sha256.
 */
export declare function md5Base64File(path: string): Promise<string>;
