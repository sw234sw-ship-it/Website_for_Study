"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUrl = normalizeUrl;
exports.makeDedupKey = makeDedupKey;
exports.dedupByKey = dedupByKey;
const STRIP_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'ref',
    'source'
]);
function normalizeUrl(raw) {
    try {
        const url = new URL(raw);
        url.hash = '';
        for (const key of Array.from(url.searchParams.keys())) {
            if (STRIP_PARAMS.has(key.toLowerCase())) {
                url.searchParams.delete(key);
            }
        }
        url.hostname = url.hostname.toLowerCase();
        return url.toString();
    }
    catch {
        return raw.trim();
    }
}
function makeDedupKey(url, title) {
    const cleanUrl = normalizeUrl(url);
    const cleanTitle = title.trim().toLowerCase();
    return `${cleanUrl}::${cleanTitle}`;
}
function dedupByKey(items) {
    const byKey = new Map();
    for (const item of items) {
        const existing = byKey.get(item.dedupKey);
        if (!existing) {
            byKey.set(item.dedupKey, item);
            continue;
        }
        if (existing.url !== item.url) {
            if (existing.url.length > item.url.length) {
                byKey.set(item.dedupKey, item);
            }
        }
    }
    return Array.from(byKey.values());
}
//# sourceMappingURL=dedup.js.map