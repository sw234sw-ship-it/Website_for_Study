import { logger } from 'firebase-functions';
import { ingestTopicRSS, loadRSSConfig } from './ingest/rss';
import { ingestCommunityDC, loadDcConfig } from './ingest/dcinside';
import { generateDailyBriefingForTopic } from './generate/generateDaily';
import { collections } from './db';
import { nowKST } from './utils/time';
import { Topic } from './types';

export async function runDailyOrchestration() {
  const startedAt = nowKST().toISOString();
  const rssConfig = loadRSSConfig();
  const dcConfig = loadDcConfig();

  const topics: Topic[] = ['macro', 'ai', 'battery'];
  const failedTopics: Topic[] = [];
  const errorStack: string[] = [];
  let totalCollected = 0;
  let totalDeduped = 0;

  for (const topic of topics) {
    try {
      const rss = await ingestTopicRSS(topic, rssConfig[topic] || []);
      totalCollected += rss.collected;
      totalDeduped += rss.deduped;
      logger.info('RSS ingest stats', { topic, ...rss });
    } catch (err) {
      failedTopics.push(topic);
      errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
      logger.error('RSS ingest failed', { topic, err });
    }

    try {
      const dc = await ingestCommunityDC(topic, dcConfig[topic] || []);
      totalCollected += dc.collected;
      totalDeduped += dc.deduped;
      logger.info('DC ingest stats', { topic, ...dc });
    } catch (err) {
      failedTopics.push(topic);
      errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
      logger.warn('DC ingest failed', { topic, err });
    }

    try {
      const article = await generateDailyBriefingForTopic(topic);
      logger.info('Briefing generated', {
        topic,
        success: Boolean(article),
        charCount: article?.charCount ?? 0
      });
    } catch (err) {
      failedTopics.push(topic);
      errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
      logger.error('Generate failed', { topic, err });
    }
  }

  await collections.jobs.add({
    jobType: 'orchestrate',
    topic: 'all',
    status: failedTopics.length ? 'failed' : 'success',
    startedAt,
    finishedAt: nowKST().toISOString(),
    durationMs: Date.now() - new Date(startedAt).getTime(),
    count: totalCollected,
    dedupedCount: totalDeduped,
    errorCount: failedTopics.length,
    failedTopics,
    errorStack: errorStack.join('\n')
  });
}
