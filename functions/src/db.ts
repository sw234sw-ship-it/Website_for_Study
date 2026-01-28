import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ArticleDoc, SourceDoc, Topic, JobDoc } from './types';

const app = initializeApp({
  credential: applicationDefault()
});

export const db = getFirestore(app);

export const collections = {
  sources: db.collection('sources'),
  articles: db.collection('articles'),
  jobs: db.collection('jobs')
};

export function sourcesByTopicRecent(topic: Topic, sinceIso: string) {
  return collections.sources
    .where('topic', '==', topic)
    .where('publishedAt', '>=', sinceIso)
    .orderBy('publishedAt', 'desc');
}

export function articleDocId(topic: Topic, dateKey: string): string {
  return `${topic}_${dateKey}`;
}

export function articleDocRef(topic: Topic, dateKey: string) {
  return collections.articles.doc(articleDocId(topic, dateKey));
}

export function jobsRef() {
  return collections.jobs;
}

export type { ArticleDoc, SourceDoc, JobDoc };
