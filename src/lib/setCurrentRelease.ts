export type SetCurrentReleaseParams = {
  productUuid: string;
  downloadId: string;
  apiToken: string;
  fetcher?: typeof fetch;
};

export async function setCurrentRelease(params: SetCurrentReleaseParams): Promise<void> {
  const fetcher = params.fetcher ?? fetch;
  const res = await fetcher(`https://api.surecart.com/v1/products/${params.productUuid}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${params.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product: { current_release_download: params.downloadId } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SureCart PATCH /v1/products returned ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { current_release_download: string | null };
  if (data.current_release_download === null) {
    throw new Error(
      'SureCart PATCH succeeded but current_release_download is still null — update did not apply.'
    );
  }
}
