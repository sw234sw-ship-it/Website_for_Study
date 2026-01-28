"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyBriefingForTopic = generateDailyBriefingForTopic;
exports.generateDailyBriefings = generateDailyBriefings;
const db_1 = require("../db");
const time_1 = require("../utils/time");
const writer_1 = require("./writer");
const MAX_SOURCES = 30;
function isCommunity(source) {
    return source.sourceType === 'community';
}
function takeLatest(sources, max) {
    return sources
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, max);
}
async function generateDailyBriefingForTopic(topic) {
    const startedAt = (0, time_1.nowKST)().toISOString();
    let errors = 0;
    try {
        const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        const snapshot = await (0, db_1.sourcesByTopicRecent)(topic, since).limit(MAX_SOURCES).get();
        const allSources = snapshot.docs.map((d) => d.data());
        const recentSources = allSources.filter((s) => (0, time_1.withinHours)(s.publishedAt, 72));
        const community = recentSources.filter(isCommunity);
        const primary = recentSources.filter((s) => !isCommunity(s));
        const dateKey = (0, time_1.toDateKeyKST)();
        const article = await (0, writer_1.writeBriefing)({
            topic,
            dateKey,
            sources: takeLatest(primary, MAX_SOURCES),
            community
        });
        if (article.sourceUrls.length < 5) {
            throw new Error('Not enough sources to generate briefing');
        }
        await (0, db_1.articleDocRef)(topic, dateKey).set({
            topic,
            dateKey,
            title: article.title,
            lead: article.lead,
            bodyMarkdown: article.bodyMarkdown,
            charCount: article.charCount,
            sourceUrls: article.sourceUrls,
            createdAt: (0, time_1.nowKST)().toISOString()
        }, { merge: true });
        await db_1.collections.jobs.add({
            jobType: 'generate',
            topic,
            status: 'success',
            startedAt,
            finishedAt: (0, time_1.nowKST)().toISOString(),
            durationMs: Date.now() - new Date(startedAt).getTime(),
            count: article.sourceUrls.length
        });
        return article;
    }
    catch (err) {
        errors += 1;
        await db_1.collections.jobs.add({
            jobType: 'generate',
            topic,
            status: 'failed',
            startedAt,
            finishedAt: (0, time_1.nowKST)().toISOString(),
            durationMs: Date.now() - new Date(startedAt).getTime(),
            error: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack || err.message : String(err),
            errorCount: errors
        });
        return null;
    }
}
async function generateDailyBriefings(topics) {
    for (const topic of topics) {
        await generateDailyBriefingForTopic(topic);
    }
}
//# sourceMappingURL=generateDaily.js.map