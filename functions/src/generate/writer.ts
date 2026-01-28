import { ArticleDoc, SourceDoc } from '../types';
import { buildRuleBasedBriefing } from './ruleBasedWriter';
import { writeBriefingLLM } from './llmWriter';
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

export async function writeBriefing(input: WriteInput): Promise<WriteOutput> {
  const cfg = config()?.llm || {};
  const enabled = process.env.LLM_ENABLED ?? cfg.enabled;
  const useLLM = enabled === 'true' || enabled === true;

  if (useLLM) {
    try {
      return await writeBriefingLLM(input);
    } catch (err) {
      // fallback to rule-based writer on any failure
      return buildRuleBasedBriefing(input.topic, input.sources, input.community, input.dateKey);
    }
  }

  return buildRuleBasedBriefing(input.topic, input.sources, input.community, input.dateKey);
}
