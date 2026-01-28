import fs from 'node:fs';
import path from 'node:path';
import cheerio from 'cheerio';
import { logger } from 'firebase-functions';
import { collections } from '../db';
import { makeDedupKey, normalizeUrl } from '../utils/dedup';
import { nowKST, withinHours } from '../utils/time';
import { SourceDoc, Topic } from '../types';

const CONFIG_PATH = path.resolve(__dirname, '../../../config/dc_galls.json');
const PLACEHOLDER_PATTERNS = ['<gall>', '<list_url>', 'example.com'];
const MAX_ITEMS = 30;
const USER_AGENT = 'Mozilla/5.0 (compatible; briefing-bot/1.0; +https://example.com)';

type GallConfig = { name: string; url: string };

type DcConfig = Record<Topic, GallConfig[]>;

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function toIso(input?: string | null): string | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseGallItems(html: string) {
  const $ = cheerio.load(html);
  const rows = $('tr.ub-content').slice(0, MAX_ITEMS);
  const items: { title: string; url: string; createdAt: string }[] = [];

  rows.each((_, row) => {
    const link = $(row).find('a').first();
    const title = link.text().trim();
    const href = link.attr('href') || '';
    const dateText = $(row).find('.gall_date').attr('title') || $(row).find('.gall_date').text();

    if (!title || !href || !dateText) return;
    items.push({
      title,
      url: href,
      createdAt: dateText.trim()
    });
  });

  return items;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

export async function ingestCommunityDC(topic: Topic, galls: GallConfig[]) {
  const startedAt = nowKST().toISOString();
  let collected = 0;
  let deduped = 0;
  let errors = 0;
  const errorStack: string[] = [];

  for (const gall of galls) {
    if (!gall?.url || !gall?.name || isPlaceholder(gall.url) || isPlaceholder(gall.name)) {
      logger.info('Skip placeholder DC gall', { topic, gall });
      continue;
    }

    try {
      const html = await fetchHtml(gall.url);
      const items = parseGallItems(html);

      for (const item of items) {
        const publishedIso = toIso(item.createdAt);
        if (!publishedIso || !withinHours(publishedIso, 72)) {
          continue;
        }

        const url = normalizeUrl(item.url);
        const title = item.title.trim();
        if (!url || !title) continue;

        const dedupKey = makeDedupKey(url, title);
        const docId = encodeURIComponent(dedupKey);
        const docRef = collections.sources.doc(docId);
        const existing = await docRef.get();
        if (existing.exists) {
          deduped += 1;
          continue;
        }

        // Community signals are NOT facts; they are reference-only and must never be used as factual evidence.
        const source: SourceDoc = {
          topic,
          title,
          url,
          publisher: 'DCInside',
          publishedAt: publishedIso,
          snippet: '',
          sourceType: 'community',
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
      // Fail-soft: skip and only log to jobs; do not fail the whole service.
      logger.warn('DC ingest skipped', { topic, gall, err });
    }
  }

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

  return { collected, deduped, errors };
}

export function loadDcConfig(): DcConfig {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as DcConfig;
}
