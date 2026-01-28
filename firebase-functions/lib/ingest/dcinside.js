"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestCommunityDC = ingestCommunityDC;
exports.loadDcConfig = loadDcConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const cheerio_1 = __importDefault(require("cheerio"));
const firebase_functions_1 = require("firebase-functions");
const db_1 = require("../db");
const dedup_1 = require("../utils/dedup");
const time_1 = require("../utils/time");
const CONFIG_PATH = node_path_1.default.resolve(__dirname, '../../../config/dc_galls.json');
const PLACEHOLDER_PATTERNS = ['<gall>', '<list_url>', 'example.com'];
const MAX_ITEMS = 30;
const USER_AGENT = 'Mozilla/5.0 (compatible; briefing-bot/1.0; +https://example.com)';
function isPlaceholder(value) {
    const lower = value.toLowerCase();
    return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}
function toIso(input) {
    if (!input)
        return null;
    const date = new Date(input);
    if (Number.isNaN(date.getTime()))
        return null;
    return date.toISOString();
}
function parseGallItems(html) {
    const $ = cheerio_1.default.load(html);
    const rows = $('tr.ub-content').slice(0, MAX_ITEMS);
    const items = [];
    rows.each((_, row) => {
        const link = $(row).find('a').first();
        const title = link.text().trim();
        const href = link.attr('href') || '';
        const dateText = $(row).find('.gall_date').attr('title') || $(row).find('.gall_date').text();
        if (!title || !href || !dateText)
            return;
        items.push({
            title,
            url: href,
            createdAt: dateText.trim()
        });
    });
    return items;
}
async function fetchHtml(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return res.text();
}
async function ingestCommunityDC(topic, galls) {
    const startedAt = (0, time_1.nowKST)().toISOString();
    let collected = 0;
    let deduped = 0;
    let errors = 0;
    const errorStack = [];
    for (const gall of galls) {
        if (!gall?.url || !gall?.name || isPlaceholder(gall.url) || isPlaceholder(gall.name)) {
            firebase_functions_1.logger.info('Skip placeholder DC gall', { topic, gall });
            continue;
        }
        try {
            const html = await fetchHtml(gall.url);
            const items = parseGallItems(html);
            for (const item of items) {
                const publishedIso = toIso(item.createdAt);
                if (!publishedIso || !(0, time_1.withinHours)(publishedIso, 72)) {
                    continue;
                }
                const url = (0, dedup_1.normalizeUrl)(item.url);
                const title = item.title.trim();
                if (!url || !title)
                    continue;
                const dedupKey = (0, dedup_1.makeDedupKey)(url, title);
                const docId = encodeURIComponent(dedupKey);
                const docRef = db_1.collections.sources.doc(docId);
                const existing = await docRef.get();
                if (existing.exists) {
                    deduped += 1;
                    continue;
                }
                // Community signals are NOT facts; they are reference-only and must never be used as factual evidence.
                const source = {
                    topic,
                    title,
                    url,
                    publisher: 'DCInside',
                    publishedAt: publishedIso,
                    snippet: '',
                    sourceType: 'community',
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
            // Fail-soft: skip and only log to jobs; do not fail the whole service.
            firebase_functions_1.logger.warn('DC ingest skipped', { topic, gall, err });
        }
    }
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
    return { collected, deduped, errors };
}
function loadDcConfig() {
    const raw = node_fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
}
//# sourceMappingURL=dcinside.js.map