import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';
import { logger } from 'firebase-functions';
import { collections } from '../db';
import { makeDedupKey, normalizeUrl } from '../utils/dedup';
import { nowKST, withinHours } from '../utils/time';
import { SourceDoc, Topic } from '../types';

const parser = new Parser();
const CONFIG_PATH = path.resolve(__dirname, '../../../config/rss_feeds.json');
const PLACEHOLDER_PATTERNS = ['<RSS_URL', 'YOUR_RSS_URL', 'example.com'];

function isPlaceholder(url: string): boolean {
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function docIdForDedup(dedupKey: string): string {
  return encodeURIComponent(dedupKey);
}

function toIso(input?: string | Date | null): string | null {
  if (!input) return null;
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function ingestTopicRSS(topic: Topic, urls: string[]) {
  const startedAt = nowKST().toISOString();
  let collected = 0;
  let deduped = 0;
  let errors = 0;
  const errorStack: string[] = [];

  for (const feedUrl of urls) {
    if (!feedUrl || isPlaceholder(feedUrl)) {
      logger.info('Skip placeholder RSS URL', { topic, feedUrl });
      continue;
    }

    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const publishedIso = toIso(item.isoDate || item.pubDate);
        if (!publishedIso || !withinHours(publishedIso, 72)) {
          continue;
        }

        const url = normalizeUrl(item.link || '');
        const title = (item.title || '').trim();
        if (!url || !title) continue;

        const dedupKey = makeDedupKey(url, title);
        const docId = docIdForDedup(dedupKey);
        const docRef = collections.sources.doc(docId);
        const existing = await docRef.get();
        if (existing.exists) {
          deduped += 1;
          continue;
        }

        const source: SourceDoc = {
          topic,
          title,
          url,
          publisher: feed.title || feedUrl,
          publishedAt: publishedIso,
          snippet: (item.contentSnippet || item.content || '').toString().slice(0, 500),
          sourceType: 'rss',
          fetchedAt: nowKST().toISOString(),
          dedupKey,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        };

        await docRef.set(source, { merge: true });
        collected += 1;
      }
    } catch (err) {
      errors += 1;
      errorStack.push(err instanceof Error ? err.stack || err.message : String(err));
      logger.error('RSS ingest error', { topic, feedUrl, err });
    }
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await collections.jobs.add({
    jobType: 'collect',
    topic,
    status: errors > 0 ? 'failed' : 'success',
    startedAt,
    finishedAt: nowKST().toISOString(),
    durationMs: Date.now() - new Date(startedAt).getTime(),
    count: collected,
    dedupedCount: deduped,
    errorCount: errors,
    errorStack: errorStack.join('\n')
  });

  return { collected, deduped, errors, expiresAt };
}

export function loadRSSConfig(): Record<Topic, string[]> {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as Record<Topic, string[]>;
}
