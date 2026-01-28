"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const dedup_1 = require("../utils/dedup");
const time_1 = require("../utils/time");
const normalized = (0, dedup_1.normalizeUrl)('https://Example.com/news?id=1&utm_source=test#hash');
strict_1.default.equal(normalized.startsWith('https://example.com/'), true);
const key = (0, dedup_1.makeDedupKey)('https://example.com/a', 'Hello World');
strict_1.default.equal(key, 'https://example.com/a::hello world');
const dateKey = (0, time_1.toDateKeyKST)('2026-01-28T00:00:00Z');
strict_1.default.equal(dateKey.length, 10);
console.log('smoke test ok');
//# sourceMappingURL=smoke.test.js.map