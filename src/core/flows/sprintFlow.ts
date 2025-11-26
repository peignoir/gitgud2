/*
 * Flow: Sprint Flow
 * 
 * [User Input] -> [Sprint Coach Agent] -> [JSON Parser] -> [Sprint Plan State]
 *      ^                                         |
 *      |-----------------------------------------|
 *             (Streaming Conversation)
 */

import { createSprintCoach } from "../agents/sprintCoach.js";
import { runAgentWithStreaming, announceSection } from "../runner.js";
import { extractJsonBlock } from "../utils/extraction.js";
import { 
  founderProfileSnapshot, 
  longTermMemorySnapshot, 
  formattedIdeaBacklog,
  formattedResearchSources
} from "../state/utils.js";
import { ensureConversationSession } from "../state/conversation.js";
import { refreshLongTermMemory } from "../state/memory.js";
import { getUserState, sprintPlanSchema, SprintPlan } from "../state/userState.js";

function extractSprintPlan(text: string): SprintPlan | null {
  const block = extractJsonBlock(text, "SPRINT_PLAN");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return sprintPlanSchema.parse(parsed);
  } catch {
    return null;
  }
}

function buildBusinessInput(userId: string, question: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(userId),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(userId),
    "",
    "Recent research sources:",
    formattedResearchSources(userId)
  ].join("\n");
}

export async function runSprintFlow(userId: string, question: string) {
  const sprintCoach = await createSprintCoach();
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  announceSection("sprint", "YC Sprint Coach");
  const sprintInput = buildBusinessInput(userId, question + "\n\nTask: Provide a 90-minute execution plan. Be extremely tactical. Focus on 'Do things that don't scale'.");
  const { fullText } = await runAgentWithStreaming(sprintCoach, sprintInput, "sprint", userId);

  const plan = extractSprintPlan(fullText);
  if (plan) {
    const state = getUserState(userId);
    state.sprintPlan = plan;
  }
}

