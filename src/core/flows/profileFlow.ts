/*
 * Flow: Profile Flow
 * 
 * [User Input] -> [Founder Profiler Agent] -> [JSON Parser] -> [State Update]
 *      ^                                         |
 *      |-----------------------------------------|
 *             (Streaming Conversation)
 */

import { createFounderProfiler } from "../agents/founderProfiler.js";
import { runAgentWithStreaming, heading } from "../runner.js";
import { isQuietMode } from "../state/config.js";
import { extractJsonBlock } from "../utils/extraction.js";
import { 
  founderProfileSnapshot, 
  longTermMemorySnapshot, 
  formattedIdeaBacklog, 
  formattedResearchSources, 
  mergeFounderProfile 
} from "../state/utils.js";
import { ensureConversationSession } from "../state/conversation.js";
import { refreshLongTermMemory } from "../state/memory.js";
import { getUserState, founderProfileSchema, FounderProfile } from "../state/userState.js";

function extractFounderProfile(text: string): FounderProfile | null {
  const block = extractJsonBlock(text, "FOUNDER_PROFILE");
  if (!block) {
    return null;
  }

  try {
    const parsed = JSON.parse(block);
    return founderProfileSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function runFounderProfiler(userId: string, question: string, hasExistingMemory: boolean = false) {
  const founderProfiler = await createFounderProfiler();

  if (!isQuietMode()) {
    console.log(heading("profile", "\n=== YC Founder Profiler (Deep Research Mode) ===\n"));
  }
  
  const profileSnapshot = founderProfileSnapshot(userId);
  const isReturningUser = hasExistingMemory && profileSnapshot !== "(no founder profile yet)";
  const state = getUserState(userId);
  const currentTier = state.founderProfile.experience_tier || "unknown";
  
  const profilerInput = [
    "Founder input:",
    question,
    "",
    isReturningUser ? "RETURNING USER - Existing profile detected:" : "NEW USER - No existing profile:",
    "Current founder profile (JSON):",
    profileSnapshot,
    "",
    `Current experience tier: ${currentTier}`,
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(userId),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(userId),
    "",
    "Recent research sources:",
    formattedResearchSources(userId),
    "",
    "IMPORTANT INSTRUCTIONS:",
    "1. If the founder mentions ANY company, person, school, or shares a LinkedIn URL:",
    "   - Use Tavily search with searchDepth: 'advanced' to research it deeply.",
    "   - Look for funding history, exits, press coverage, academic background.",
    "   - If you find additional entities (investors, acquirers), do a SECOND search on those.",
    "2. Output status messages like '[Searching] Company X...' and '[Found] 3 articles...' so the user knows research is happening.",
    "3. Classify the founder as first-time, experienced, or serial based on your research.",
    "4. Adapt your tone based on their experience tier.",
    "",
    isReturningUser 
      ? "Task: RETURNING USER. Welcome them back, summarize their profile, ask if updates needed. Output READY with existing JSON."
      : "Task: NEW USER. Research their background thoroughly (2-level deep search). Build a complete profile. Output the full JSON with all fields including experience_tier, funding_history, exits, academic, social_capital."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(founderProfiler, profilerInput, "profile", userId);
  const profileUpdate = extractFounderProfile(fullText);
  await mergeFounderProfile(userId, profileUpdate);
}

export async function runProfileFlow(userId: string, question: string) {
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);
  
  // Check if user has existing profile/memories
  const state = getUserState(userId);
  const hasExistingMemory = state.longTermMemories.length > 0 || 
                            Object.keys(state.founderProfile).length > 0;
  
  // Profile flow is purely a conversation with the Founder Profiler
  await runFounderProfiler(userId, question, hasExistingMemory);
}

