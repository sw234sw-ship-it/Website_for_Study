import { ArticleDoc, SourceDoc } from '../types';
import { getSecretValue } from '../secrets';
import { config } from 'firebase-functions';

type WriteInput = {
  topic: ArticleDoc['topic'];
  dateKey: string;
  sources: SourceDoc[];
  community: SourceDoc[];
};

type WriteOutput = {
  title: string;
  lead: string;
  bodyMarkdown: string;
  charCount: number;
  sourceUrls: string[];
};

function buildPrompt(input: WriteInput, sourceUrls: string[]) {
  const sources = input.sources.map((s, idx) => {
    const n = idx + 1;
    return [
      `[#${n}] ${s.title}`,
      `url: ${s.url}`,
      `publishedAt: ${s.publishedAt}`,
      `snippet: ${s.snippet || ''}`
    ].join('\n');
  });

  const community = input.community.map((c) => `- ${c.title}`).join('\n');

  return [
    '당신은 한국어 브리핑 작성자입니다.',
    '다음 규칙을 반드시 지키세요:',
    '1) 제공된 sources의 title/snippet/url/publishedAt만 근거로 쓴다.',
    '2) 문장 끝에 출처 번호를 붙인다. 예: 문장...[1][2]',
    '3) 섹션은 반드시 "요약", "사실", "해석", "커뮤니티(참고)", "출처"로 구성한다.',
    '4) 커뮤니티는 참고 신호로만 사용하며 사실 주장 금지.',
    '5) 출처 링크는 최소 5개 포함한다. 번호는 sourceUrls 배열 순서를 따른다.',
    '6) 본문 길이는 800~1500자로 맞춘다. 넘으면 스스로 축약한다.',
    '',
    `topic: ${input.topic}`,
    `dateKey: ${input.dateKey}`,
    '',
    'sourceUrls 순서:',
    sourceUrls.map((u, i) => `[#${i + 1}] ${u}`).join('\n'),
    '',
    'sources:',
    sources.join('\n\n'),
    '',
    'community titles:',
    community || '(없음)',
    '',
    '출력은 반드시 JSON으로만 작성한다:',
    '{"title":"...","lead":"...","bodyMarkdown":"..."}'
  ].join('\n');
}

function readConfig() {
  const cfg = config()?.llm || {};
  return {
    enabled: process.env.LLM_ENABLED ?? cfg.enabled,
    endpoint: process.env.LLM_ENDPOINT ?? cfg.endpoint,
    model: process.env.LLM_MODEL ?? cfg.model,
    secretName: process.env.LLM_API_KEY_SECRET ?? cfg.secret,
    apiKey: process.env.LLM_API_KEY ?? cfg.api_key
  };
}

async function callLLM(prompt: string): Promise<string> {
  const cfg = readConfig();
  const endpoint = cfg.endpoint;
  if (!endpoint) {
    throw new Error('LLM_ENDPOINT not configured');
  }

  const secretName = cfg.secretName;
  const apiKey = secretName ? await getSecretValue(secretName) : cfg.apiKey;
  if (!apiKey) {
    throw new Error('LLM API key not configured');
  }

  const model = cfg.model || 'gpt-4o-mini';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function parseJson(text: string): { title: string; lead: string; bodyMarkdown: string } {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) throw new Error('Invalid JSON from LLM');
  const json = trimmed.slice(jsonStart, jsonEnd + 1);
  return JSON.parse(json);
}

function validateOutput(bodyMarkdown: string, sourceUrls: string[]) {
  if (bodyMarkdown.length < 800 || bodyMarkdown.length > 1500) {
    throw new Error('LLM output length out of range');
  }
  if (sourceUrls.length < 5) {
    throw new Error('Not enough source URLs');
  }
  if (!bodyMarkdown.includes('사실') || !bodyMarkdown.includes('해석')) {
    throw new Error('Missing required sections');
  }
}

export async function writeBriefingLLM(input: WriteInput): Promise<WriteOutput> {
  const sourceUrls = input.sources.map((s) => s.url).filter(Boolean).slice(0, 10);
  const prompt = buildPrompt(input, sourceUrls);
  const raw = await callLLM(prompt);
  const parsed = parseJson(raw);

  const bodyMarkdown = parsed.bodyMarkdown ?? '';
  const charCount = bodyMarkdown.length;
  validateOutput(bodyMarkdown, sourceUrls);

  return {
    title: parsed.title ?? `${input.topic.toUpperCase()} 데일리 브리핑`,
    lead: parsed.lead ?? '',
    bodyMarkdown,
    charCount,
    sourceUrls,
  };
}
