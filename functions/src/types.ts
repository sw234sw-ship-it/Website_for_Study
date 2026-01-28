export type Topic = 'macro' | 'ai' | 'battery';

export type SourceType = 'rss' | 'api' | 'serp' | 'community';

export interface SourceDoc {
  topic: Topic;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string; // ISO string
  snippet: string;
  sourceType: SourceType;
  fetchedAt: string; // ISO string
  dedupKey: string;
  expiresAt?: Date; // TTL timestamp
}

export interface ArticleDoc {
  topic: Topic;
  dateKey: string; // YYYY-MM-DD (KST)
  title: string;
  lead: string;
  bodyMarkdown: string;
  charCount: number;
  sourceUrls: string[];
  createdAt: string; // ISO string
}

export type JobType = 'collect' | 'generate' | 'orchestrate' | 'error';

export interface JobDoc {
  jobType: JobType;
  topic: Topic | 'all';
  status: 'running' | 'success' | 'failed';
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  durationMs?: number;
  count?: number;
  dedupedCount?: number;
  errorCount?: number;
  error?: string;
  errorStack?: string;
  failedTopics?: Topic[];
}
