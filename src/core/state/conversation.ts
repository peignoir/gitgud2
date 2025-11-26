import { OpenAIConversationsSession, startOpenAIConversationsSession } from "@openai/agents-openai";
import { getUserState } from "./userState.js";
import { loadConversationIdFromCache, saveConversationIdToCache, clearConversationCache } from "./memory.js";
import { openai } from "./openai.js";

export async function getOrCreateConversationId(userId: string, force = false): Promise<string> {
  if (!force) {
    const cached = loadConversationIdFromCache(userId);
    if (cached) {
      return cached;
    }
  }

  const newId = await startOpenAIConversationsSession(openai as any);
  saveConversationIdToCache(userId, newId);
  return newId;
}

export async function ensureConversationSession(userId: string, force = false): Promise<void> {
  const state = getUserState(userId);
  if (!force && state.conversationSession) {
    return;
  }
  const conversationId = await getOrCreateConversationId(userId, force);
  state.conversationSession = new OpenAIConversationsSession({ conversationId, client: openai as any });
}

export async function resetConversationSession(userId: string): Promise<void> {
  const state = getUserState(userId);
  clearConversationCache(userId);
  state.conversationSession = null;
  await ensureConversationSession(userId, true);
}

export function isConversationMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const anyError = error as { status?: number; message?: string };
  const message = anyError.message?.toLowerCase() ?? "";
  const statusMatch = anyError.status === 404 || message.includes("not found");
  return statusMatch && message.includes("conversation");
}

