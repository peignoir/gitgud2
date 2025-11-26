/*
 * Flow: Ideation Flow
 * 
 * [User Input] -> [Research Agent (implied context)] -> [Ideation Agent] -> [JSON Parser] -> [Idea Backlog]
 *      ^                                                       |
 *      |-------------------------------------------------------|
 *             (Streaming Conversation)
 */

import { createIdeationMentor } from "../agents/ideationMentor.js";
import { createResearchAgent } from "../agents/researchAgent.js";
import { runAgentWithStreaming, heading, announceSection } from "../runner.js";
import { extractJsonBlock } from "../utils/extraction.js";
import { 
  founderProfileSnapshot, 
  longTermMemorySnapshot
} from "../state/utils.js";
import { trimList } from "../state/userState.js";
import { ensureConversationSession } from "../state/conversation.js";
import { refreshLongTermMemory } from "../state/memory.js";
import { getUserState, ideationResultSchema, IdeationResult, IDEA_BACKLOG_LIMIT } from "../state/userState.js";

function extractIdeationResults(text: string): IdeationResult | null {
  const block = extractJsonBlock(text, "IDEATION_RESULTS");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return ideationResultSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runIdeationFlow(userId: string, question: string) {
  // We might need research agent context, but here we just check initialization if we were using singletons.
  // Since we create agents on the fly, we just create them.
  const ideationMentor = await createIdeationMentor();
  
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  const state = getUserState(userId);
  const founderBackground = state.founderProfile.background || "";
  const founderExits = state.founderProfile.exits || "";
  const experienceTier = state.founderProfile.experience_tier || "unknown";
  
  // Build context about what to AVOID (founder's past work)
  const avoidContext = [
    founderBackground,
    founderExits,
    state.founderIdeaBacklog.join(", ")
  ].filter(Boolean).join(". ");
  
  // 1. Ideation Mentor (it will do its own trend research per the prompt)
  announceSection("ideation", "YC Ideation Partner (Creative Mode)");
  
  const ideationInput = [
    "Founder input:",
    question,
    "",
    "Founder profile:",
    founderProfileSnapshot(userId),
    "",
    `Experience tier: ${experienceTier}`,
    "",
    "CRITICAL - DO NOT SUGGEST IDEAS SIMILAR TO:",
    avoidContext || "(No prior work detected)",
    "",
    "Founder's skills to leverage (from profile):",
    state.founderProfile.unfair_advantages || state.founderProfile.background || "(Infer from profile)",
    "",
    "Founder's network edges (from profile):",
    state.founderProfile.social_capital || "(Infer from profile)",
    "",
    "Long-term memory:",
    longTermMemorySnapshot(userId),
    "",
    "TASK:",
    "1. Use Tavily to search for '2025 emerging startup trends' and 'non-obvious startup opportunities 2025'.",
    "2. Generate 4 ideas: 2 using skills transfer to NEW industries, 2 using network leverage.",
    "3. Each idea must be DIFFERENT from the founder's past work.",
    "4. Be specific: name the first customer, explain the timing."
  ].join("\n");
  
  const { fullText } = await runAgentWithStreaming(ideationMentor, ideationInput, "ideation", userId);
  
  // Store results
  const results = extractIdeationResults(fullText);
  if (results) {
    const state = getUserState(userId);
    state.ideationResults = results;
    // Also push to idea backlog
    if (results.top_ideas) {
      for (const idea of results.top_ideas) {
        if (!state.founderIdeaBacklog.includes(idea)) {
          state.founderIdeaBacklog.push(idea);
        }
      }
      trimList(state.founderIdeaBacklog, IDEA_BACKLOG_LIMIT);
    }
  }
}

