export type CreateDownloadParams = {
    productUuid: string;
    apiToken: string;
    behavior: 'warn' | 'error';
    fetcher?: typeof fetch;
} & ({
    mediaId: string;
} | {
    externalUrl: string;
    name: string;
});
export type CreateDownloadResult = {
    id: string | null;
    isDuplicate: boolean;
};
export declare function createDownload(params: CreateDownloadParams): Promise<CreateDownloadResult>;
