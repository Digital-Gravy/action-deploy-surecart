export type ReleaseJson = {
    slug?: string;
    version?: string;
    [key: string]: unknown;
};
export type CreateMediaParams = {
    signedId: string;
    apiToken: string;
    fetcher?: typeof fetch;
};
export type CreateMediaResult = {
    id: string;
    releaseJson: ReleaseJson | null;
};
/**
 * Attach an uploaded blob (by signed_id) to a SureCart Media record. The
 * version is recognised asynchronously, so release_json is typically null in
 * this immediate response — poll the media afterwards (see pollMediaRelease)
 * until the version appears.
 */
export declare function createMedia(params: CreateMediaParams): Promise<CreateMediaResult>;
