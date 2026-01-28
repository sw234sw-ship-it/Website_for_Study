"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyOrchestration = runDailyOrchestration;
const firebase_functions_1 = require("firebase-functions");
const rss_1 = require("./ingest/rss");
const dcinside_1 = require("./ingest/dcinside");
const generateDaily_1 = require("./generate/generateDaily");
const db_1 = require("./db");
const time_1 = require("./utils/time");
async function runDailyOrchestration() {
    const startedAt = (0, time_1.nowKST)().toISOString();
    const rssConfig = (0, rss_1.loadRSSConfig)();
    const dcConfig = (0, dcinside_1.loadDcConfig)();
    const topics = ['macro', 'ai', 'battery'];
    const failedTopics = [];
    const errorStack = [];
    let totalCollected = 0;
    let totalDeduped = 0;
    for (const topic of topics) {
        try {
            const rss = await (0, rss_1.ingestTopicRSS)(topic, rssConfig[topic] || []);
            totalCollected += rss.collected;
            totalDeduped += rss.deduped;
            firebase_functions_1.logger.info('RSS ingest stats', { topic, ...rss });
        }
        catch (err) {
            failedTopics.push(topic);
            errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
            firebase_functions_1.logger.error('RSS ingest failed', { topic, err });
        }
        try {
            const dc = await (0, dcinside_1.ingestCommunityDC)(topic, dcConfig[topic] || []);
            totalCollected += dc.collected;
            totalDeduped += dc.deduped;
            firebase_functions_1.logger.info('DC ingest stats', { topic, ...dc });
        }
        catch (err) {
            failedTopics.push(topic);
            errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
            firebase_functions_1.logger.warn('DC ingest failed', { topic, err });
        }
        try {
            const article = await (0, generateDaily_1.generateDailyBriefingForTopic)(topic);
            firebase_functions_1.logger.info('Briefing generated', {
                topic,
                success: Boolean(article),
                charCount: article?.charCount ?? 0
            });
        }
        catch (err) {
            failedTopics.push(topic);
            errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
            firebase_functions_1.logger.error('Generate failed', { topic, err });
        }
    }
    await db_1.collections.jobs.add({
        jobType: 'orchestrate',
        topic: 'all',
        status: failedTopics.length ? 'failed' : 'success',
        startedAt,
        finishedAt: (0, time_1.nowKST)().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        count: totalCollected,
        dedupedCount: totalDeduped,
        errorCount: failedTopics.length,
        failedTopics,
        errorStack: errorStack.join('\n')
    });
}
//# sourceMappingURL=orchestrate.js.map