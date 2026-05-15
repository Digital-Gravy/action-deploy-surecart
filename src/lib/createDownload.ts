import { detectDuplicate } from './duplicateErrorHandler';

export type CreateDownloadParams = {
  productUuid: string;
  apiToken: string;
  behavior: 'warn' | 'error';
  fetcher?: typeof fetch;
} & ({ mediaId: string } | { externalUrl: string; name: string });

export type CreateDownloadResult = {
  id: string | null;
  isDuplicate: boolean;
};

export async function createDownload(params: CreateDownloadParams): Promise<CreateDownloadResult> {
  const fetcher = params.fetcher ?? fetch;
  const download: Record<string, unknown> = { product: params.productUuid };
  if ('mediaId' in params) {
    download.media_id = params.mediaId;
  } else {
    download.url = params.externalUrl;
    download.name = params.name;
    download.enabled = true;
  }
  const res = await fetcher('https://api.surecart.com/v1/downloads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ download }),
  });
  if (res.ok) {
    const data = (await res.json()) as { id: string };
    return { id: data.id, isDuplicate: false };
  }

  const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const dup = detectDuplicate(errBody);

  if (dup.kind === 'duplicate') {
    if (params.behavior === 'error') {
      const msg =
        (errBody.validation_errors as Array<{ message?: string }> | undefined)?.[0]?.message ??
        'duplicate';
      throw new Error(`SureCart rejected duplicate: ${msg}`);
    }
    return { id: dup.downloadId, isDuplicate: true };
  }

  throw new Error(`SureCart /v1/downloads returned ${res.status}: ${JSON.stringify(errBody)}`);
}
