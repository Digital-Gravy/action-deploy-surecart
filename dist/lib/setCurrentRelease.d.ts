export type SetCurrentReleaseParams = {
    productUuid: string;
    downloadId: string;
    apiToken: string;
    fetcher?: typeof fetch;
};
export declare function setCurrentRelease(params: SetCurrentReleaseParams): Promise<void>;
