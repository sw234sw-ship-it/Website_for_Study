"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRuleBasedBriefing = buildRuleBasedBriefing;
const time_1 = require("../utils/time");
function takeTopSources(sources, max) {
    return sources.slice(0, max);
}
function uniqueUrls(sources) {
    const seen = new Set();
    const urls = [];
    for (const s of sources) {
        if (!seen.has(s.url)) {
            seen.add(s.url);
            urls.push(s.url);
        }
    }
    return urls;
}
function shortSentence(text) {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}
function extractKeywords(titles, topN) {
    const stop = new Set([
        '기사', '뉴스', '속보', '단독', '정리', '발표', '관련', '이슈', '오늘', '최근', '시장', '전망', '확대'
    ]);
    const counts = new Map();
    for (const title of titles) {
        const words = title
            .replace(/[\p{P}\p{S}]/gu, ' ')
            .split(/\s+/)
            .map((w) => w.trim())
            .filter((w) => w.length >= 2 && !stop.has(w));
        for (const w of words) {
            counts.set(w, (counts.get(w) ?? 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word]) => word);
}
function renderSources(urls, min) {
    const list = urls.slice(0, Math.max(min, urls.length));
    return list.map((u) => `- ${u}`).join('\n');
}
function buildRuleBasedBriefing(topic, sources, community, dateKey) {
    const effectiveDateKey = dateKey ?? (0, time_1.toDateKeyKST)();
    const picked = takeTopSources(sources, 30);
    const sourceUrls = uniqueUrls(picked);
    const summaryLines = picked.slice(0, 5).map((s) => `- ${shortSentence(s.title)}`);
    const points = picked.slice(0, 3).map((s) => {
        const fact = shortSentence(s.title);
        const analysis = shortSentence(`${s.publisher} 보도를 바탕으로 시장 반응을 점검할 필요.`);
        return `- [사실] ${fact}\n  [해석] ${analysis}`;
    });
    const communityText = community.length
        ? `- ${extractKeywords(community.map((c) => c.title), 5).join(', ')}`
        : '- (참고 신호 없음)';
    const sourcesBlock = renderSources(sourceUrls, 5);
    const blocks = [
        `# ${topic.toUpperCase()} 데일리 브리핑 (${effectiveDateKey})`,
        '## 요약',
        summaryLines.join('\n'),
        '## 핵심 포인트',
        points.join('\n'),
        '## 커뮤니티 반응(참고)',
        communityText,
        '## 출처',
        sourcesBlock
    ];
    let bodyMarkdown = blocks.join('\n\n');
    let charCount = bodyMarkdown.length;
    if (charCount > 1500) {
        const trimmedPoints = points.slice(0, 2);
        bodyMarkdown = [
            `# ${topic.toUpperCase()} 데일리 브리핑 (${effectiveDateKey})`,
            '## 요약',
            summaryLines.join('\n'),
            '## 핵심 포인트',
            trimmedPoints.join('\n'),
            '## 커뮤니티 반응(참고)',
            communityText,
            '## 출처',
            sourcesBlock
        ].join('\n\n');
        charCount = bodyMarkdown.length;
    }
    if (charCount > 1500) {
        const fewerSummary = summaryLines.slice(0, 3);
        bodyMarkdown = [
            `# ${topic.toUpperCase()} 데일리 브리핑 (${effectiveDateKey})`,
            '## 요약',
            fewerSummary.join('\n'),
            '## 핵심 포인트',
            points.slice(0, 2).join('\n'),
            '## 커뮤니티 반응(참고)',
            communityText,
            '## 출처',
            sourcesBlock
        ].join('\n\n');
        charCount = bodyMarkdown.length;
    }
    const lead = summaryLines[0]?.replace('- ', '') ?? '';
    const article = {
        topic,
        dateKey: effectiveDateKey,
        title: `${topic.toUpperCase()} 데일리 브리핑`,
        lead,
        bodyMarkdown,
        charCount,
        sourceUrls: sourceUrls.slice(0, 10),
        createdAt: (0, time_1.nowKST)().toISOString()
    };
    return article;
}
//# sourceMappingURL=ruleBasedWriter.js.map