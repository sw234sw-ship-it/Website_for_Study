import assert from 'node:assert/strict';
import { makeDedupKey, normalizeUrl } from '../utils/dedup';
import { toDateKeyKST } from '../utils/time';

const normalized = normalizeUrl('https://Example.com/news?id=1&utm_source=test#hash');
assert.equal(normalized.startsWith('https://example.com/'), true);

const key = makeDedupKey('https://example.com/a', 'Hello World');
assert.equal(key, 'https://example.com/a::hello world');

const dateKey = toDateKeyKST('2026-01-28T00:00:00Z');
assert.equal(dateKey.length, 10);

console.log('smoke test ok');
