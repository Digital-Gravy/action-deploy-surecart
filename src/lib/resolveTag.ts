export async function resolveTag(
  input: string,
  repo: string,
  token: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  if (input !== 'latest') return input;
  const res = await fetcher(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`Latest release lookup failed: ${res.status}`);
  const data = (await res.json()) as { tag_name: string };
  return data.tag_name;
}
