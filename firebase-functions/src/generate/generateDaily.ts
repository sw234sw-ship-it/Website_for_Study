import { collections, articleDocRef, sourcesByTopicRecent } from '../db';
import { toDateKeyKST, nowKST, withinHours } from '../utils/time';
import { SourceDoc, Topic } from '../types';
import { writeBriefing } from './writer';

const MAX_SOURCES = 30;

function isCommunity(source: SourceDoc): boolean {
  return source.sourceType === 'community';
}

function takeLatest(sources: SourceDoc[], max: number): SourceDoc[] {
  return sources
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, max);
}

export async function generateDailyBriefingForTopic(topic: Topic) {
  const startedAt = nowKST().toISOString();
  let errors = 0;

  try {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const snapshot = await sourcesByTopicRecent(topic, since).limit(MAX_SOURCES).get();
    const allSources = snapshot.docs.map((d) => d.data() as SourceDoc);

    const recentSources = allSources.filter((s) => withinHours(s.publishedAt, 72));
    const community = recentSources.filter(isCommunity);
    const primary = recentSources.filter((s) => !isCommunity(s));

    const dateKey = toDateKeyKST();
    const article = await writeBriefing({
      topic,
      dateKey,
      sources: takeLatest(primary, MAX_SOURCES),
      community
    });

    if (article.sourceUrls.length < 5) {
      throw new Error('Not enough sources to generate briefing');
    }

    await articleDocRef(topic, dateKey).set(
      {
        topic,
        dateKey,
        title: article.title,
        lead: article.lead,
        bodyMarkdown: article.bodyMarkdown,
        charCount: article.charCount,
        sourceUrls: article.sourceUrls,
        createdAt: nowKST().toISOString()
      },
      { merge: true }
    );

    await collections.jobs.add({
      jobType: 'generate',
      topic,
      status: 'success',
      startedAt,
      finishedAt: nowKST().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      count: article.sourceUrls.length
    });

    return article;
  } catch (err) {
    errors += 1;
    await collections.jobs.add({
      jobType: 'generate',
      topic,
      status: 'failed',
      startedAt,
      finishedAt: nowKST().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      error: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack || err.message : String(err),
      errorCount: errors
    });
    return null;
  }
}

export async function generateDailyBriefings(topics: Topic[]) {
  for (const topic of topics) {
    await generateDailyBriefingForTopic(topic);
  }
}
