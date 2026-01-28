import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export type Article = {
  topic: 'macro' | 'ai' | 'battery';
  dateKey: string;
  title: string;
  lead: string;
  bodyMarkdown: string;
  charCount: number;
  sourceUrls: string[];
  createdAt: string;
};

export async function fetchArticlesByTopic(topic: Article['topic']) {
  const q = query(
    collection(db, 'articles'),
    where('topic', '==', topic),
    orderBy('dateKey', 'desc'),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Article) }));
}

export async function fetchArticleById(id: string) {
  const ref = doc(db, 'articles', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Article) };
}
