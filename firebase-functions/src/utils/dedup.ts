const STRIP_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
  'source'
]);

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (STRIP_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function makeDedupKey(url: string, title: string): string {
  const cleanUrl = normalizeUrl(url);
  const cleanTitle = title.trim().toLowerCase();
  return `${cleanUrl}::${cleanTitle}`;
}

export function dedupByKey<T extends { dedupKey: string; url: string }>(items: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const existing = byKey.get(item.dedupKey);
    if (!existing) {
      byKey.set(item.dedupKey, item);
      continue;
    }
    if (existing.url !== item.url) {
      if (existing.url.length > item.url.length) {
        byKey.set(item.dedupKey, item);
      }
    }
  }
  return Array.from(byKey.values());
}
