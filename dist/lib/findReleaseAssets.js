"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findReleaseAssets = findReleaseAssets;
const assetNameMatcher_1 = require("./assetNameMatcher");
async function findReleaseAssets(tag, repo, token, pattern, fetcher = fetch) {
    const res = await fetcher(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
        },
    });
    if (!res.ok) {
        throw new Error(`GitHub release lookup for tag "${tag}" returned ${res.status}`);
    }
    const data = (await res.json());
    const all = data.assets ?? [];
    const matched = all.filter((a) => (0, assetNameMatcher_1.matchesGlob)(a.name, pattern));
    if (matched.length === 0) {
        throw new Error(`No release assets on tag "${tag}" match pattern "${pattern}". Available: ${all.map((a) => a.name).join(', ') || '(none)'}`);
    }
    return matched.map((a) => ({ name: a.name, downloadUrl: a.url, size: a.size }));
}
