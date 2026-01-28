"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestTopicRSS = ingestTopicRSS;
exports.loadRSSConfig = loadRSSConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const rss_parser_1 = __importDefault(require("rss-parser"));
const firebase_functions_1 = require("firebase-functions");
const db_1 = require("../db");
const dedup_1 = require("../utils/dedup");
const time_1 = require("../utils/time");
const parser = new rss_parser_1.default();
const CONFIG_PATH = node_path_1.default.resolve(__dirname, '../../../config/rss_feeds.json');
const PLACEHOLDER_PATTERNS = ['<RSS_URL', 'YOUR_RSS_URL', 'example.com'];
function isPlaceholder(url) {
    const lower = url.toLowerCase();
    return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}
function docIdForDedup(dedupKey) {
    return encodeURIComponent(dedupKey);
}
function toIso(input) {
    if (!input)
        return null;
    const date = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(date.getTime()))
        return null;
    return date.toISOString();
}
async function ingestTopicRSS(topic, urls) {
    const startedAt = (0, time_1.nowKST)().toISOString();
    let collected = 0;
    let deduped = 0;
    let errors = 0;
    const errorStack = [];
    for (const feedUrl of urls) {
        if (!feedUrl || isPlaceholder(feedUrl)) {
            firebase_functions_1.logger.info('Skip placeholder RSS URL', { topic, feedUrl });
            continue;
        }
        try {
            const feed = await parser.parseURL(feedUrl);
            for (const item of feed.items || []) {
                const publishedIso = toIso(item.isoDate || item.pubDate);
                if (!publishedIso || !(0, time_1.withinHours)(publishedIso, 72)) {
                    continue;
                }
                const url = (0, dedup_1.normalizeUrl)(item.link || '');
                const title = (item.title || '').trim();
                if (!url || !title)
                    continue;
                const dedupKey = (0, dedup_1.makeDedupKey)(url, title);
                const docId = docIdForDedup(dedupKey);
                const docRef = db_1.collections.sources.doc(docId);
                const existing = await docRef.get();
                if (existing.exists) {
                    deduped += 1;
                    continue;
                }
                const source = {
                    topic,
                    title,
                    url,
                    publisher: feed.title || feedUrl,
                    publishedAt: publishedIso,
                    snippet: (item.contentSnippet || item.content || '').toString().slice(0, 500),
                    sourceType: 'rss',
                    fetchedAt: (0, time_1.nowKST)().toISOString(),
                    dedupKey,
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                };
                await docRef.set(source, { merge: true });
                collected += 1;
            }
        }
        catch (err) {
            errors += 1;
            errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
            firebase_functions_1.logger.error('RSS ingest error', { topic, feedUrl, err });
        }
    }
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await db_1.collections.jobs.add({
        jobType: 'collect',
        topic,
        status: errors > 0 ? 'failed' : 'success',
        startedAt,
        finishedAt: (0, time_1.nowKST)().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        count: collected,
        dedupedCount: deduped,
        errorCount: errors,
        errorStack: errorStack.join('\n')
    });
    return { collected, deduped, errors, expiresAt };
}
function loadRSSConfig() {
    const raw = node_fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
}
//# sourceMappingURL=rss.js.map