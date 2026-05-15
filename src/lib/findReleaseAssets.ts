import { matchesGlob } from './assetNameMatcher';

export type ReleaseAsset = {
  name: string;
  downloadUrl: string;
  size: number;
};

export async function findReleaseAssets(
  tag: string,
  repo: string,
  token: string,
  pattern: string,
  fetcher: typeof fetch = fetch
): Promise<ReleaseAsset[]> {
  const res = await fetcher(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub release lookup for tag "${tag}" returned ${res.status}`);
  }
  const data = (await res.json()) as {
    assets?: Array<{ name: string; url: string; size: number }>;
  };
  const all = data.assets ?? [];
  const matched = all.filter((a) => matchesGlob(a.name, pattern));
  if (matched.length === 0) {
    throw new Error(
      `No release assets on tag "${tag}" match pattern "${pattern}". Available: ${all.map((a) => a.name).join(', ') || '(none)'}`
    );
  }
  return matched.map((a) => ({ name: a.name, downloadUrl: a.url, size: a.size }));
}
