/*
 * Flow: Vibecelerator Flow
 * 
 * [User Input] -> [Vibecelerator Coach Agent] -> [JSON Parser] -> [Status Update]
 *      ^                                               |
 *      |-----------------------------------------------|
 *             (Streaming Conversation)
 */

import { createVibeceleratorCoach } from "../agents/vibeceleratorCoach.js";
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
import { getUserState, vibeceleratorStatusSchema, VibeceleratorStatus } from "../state/userState.js";

function extractVibeceleratorStatus(text: string): VibeceleratorStatus | null {
  const block = extractJsonBlock(text, "VIBECELERATOR_STATUS");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return vibeceleratorStatusSchema.parse(parsed);
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

export async function runVibeceleratorFlow(userId: string, question: string) {
  const vibeceleratorCoach = await createVibeceleratorCoach();
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  announceSection("vibecelerator", "9-Day Vibecelerator Coach");
  const input = buildBusinessInput(userId, question + "\n\nTask: Guide the founder through the 9-Day Vibecelerator program. High energy, heavy on 'vibe' and momentum.");
  const { fullText } = await runAgentWithStreaming(vibeceleratorCoach, input, "vibecelerator", userId);

  const status = extractVibeceleratorStatus(fullText);
  if (status) {
    const state = getUserState(userId);
    state.vibeceleratorStatus = status;
  }
}

