"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTag = resolveTag;
async function resolveTag(input, repo, token, fetcher = fetch) {
    if (input !== 'latest')
        return input;
    const res = await fetcher(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
        },
    });
    if (!res.ok)
        throw new Error(`Latest release lookup failed: ${res.status}`);
    const data = (await res.json());
    return data.tag_name;
}
