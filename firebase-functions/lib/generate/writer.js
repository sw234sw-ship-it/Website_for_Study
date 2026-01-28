"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeBriefing = writeBriefing;
const ruleBasedWriter_1 = require("./ruleBasedWriter");
const llmWriter_1 = require("./llmWriter");
const firebase_functions_1 = require("firebase-functions");
async function writeBriefing(input) {
    const cfg = (0, firebase_functions_1.config)()?.llm || {};
    const enabled = process.env.LLM_ENABLED ?? cfg.enabled;
    const useLLM = enabled === 'true' || enabled === true;
    if (useLLM) {
        try {
            return await (0, llmWriter_1.writeBriefingLLM)(input);
        }
        catch (err) {
            // fallback to rule-based writer on any failure
            return (0, ruleBasedWriter_1.buildRuleBasedBriefing)(input.topic, input.sources, input.community, input.dateKey);
        }
    }
    return (0, ruleBasedWriter_1.buildRuleBasedBriefing)(input.topic, input.sources, input.community, input.dateKey);
}
//# sourceMappingURL=writer.js.map