import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { MemoryClient } from "mem0";
import { 
  getUserState, 
  trimList, 
  FounderProfile, 
  LONG_TERM_MEMORY_LIMIT 
} from "./userState.js";

const WORKFLOW_NAME = "yc_mentor_workflow";
const cwd = process.cwd();
export const vectorStoreCacheDir = path.resolve(cwd, ".cache");
const vectorStoreCachePath = path.resolve(vectorStoreCacheDir, "yc_vector_store.json");

const mem0ApiKey = process.env.MEM0_API_KEY;
if (!mem0ApiKey) {
  console.error("Missing MEM0_API_KEY. Please set it to use long-term memory via Mem0.");
  process.exit(1);
}

export const memClient = new MemoryClient({ apiKey: mem0ApiKey });

export function ensureCacheDir() {
  if (!fs.existsSync(vectorStoreCacheDir)) {
    fs.mkdirSync(vectorStoreCacheDir, { recursive: true });
  }
}

function todayTag(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadCachedVectorStoreId(): string | null {
  try {
    if (!fs.existsSync(vectorStoreCachePath)) {
      return null;
    }
    const raw = fs.readFileSync(vectorStoreCachePath, "utf8");
    const parsed = JSON.parse(raw) as { vectorStoreId?: string; date?: string };
    if (parsed.vectorStoreId && parsed.date === todayTag()) {
      console.log(`Reusing cached vector store ${parsed.vectorStoreId} (created ${parsed.date}).`);
      return parsed.vectorStoreId;
    }
  } catch (error) {
    console.warn("Failed to load vector store cache, will re-index.", error);
  }
  return null;
}

export function saveCachedVectorStoreId(vectorStoreId: string) {
  try {
    ensureCacheDir();
    fs.writeFileSync(
      vectorStoreCachePath,
      JSON.stringify({ vectorStoreId, date: todayTag() }, null, 2),
      "utf8"
    );
  } catch (error) {
    console.warn("Failed to write vector store cache file.", error);
  }
}

export function getConversationPath(userId: string): string {
  return path.resolve(vectorStoreCacheDir, `conversation_${userId}.json`);
}

export function loadConversationIdFromCache(userId: string): string | null {
  try {
    const conversationCachePath = getConversationPath(userId);
    if (!fs.existsSync(conversationCachePath)) {
      return null;
    }
    const raw = fs.readFileSync(conversationCachePath, "utf8");
    const parsed = JSON.parse(raw) as { conversationId?: string };
    if (parsed.conversationId && typeof parsed.conversationId === "string") {
      return parsed.conversationId;
    }
  } catch (error) {
    console.warn("Failed to read cached conversation id:", error);
  }
  return null;
}

export function saveConversationIdToCache(userId: string, conversationId: string) {
  try {
    ensureCacheDir();
    const conversationCachePath = getConversationPath(userId);
    fs.writeFileSync(conversationCachePath, JSON.stringify({ conversationId }, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to persist conversation cache:", error);
  }
}

export function clearConversationCache(userId: string) {
  try {
    const conversationCachePath = getConversationPath(userId);
    if (fs.existsSync(conversationCachePath)) {
      fs.unlinkSync(conversationCachePath);
    }
  } catch (error) {
    console.warn("Failed to clear conversation cache:", error);
  }
}

export async function refreshLongTermMemory(userId: string, query?: string) {
  const state = getUserState(userId);
  // Always refresh if query is provided (Semantic Search), otherwise respect hydration
  if (state.longTermMemoryHydrated && !query) {
    return;
  }

  try {
    let memories: any[] = [];
    
    if (query) {
      // Semantic Search - returns array directly
      const searchResult = await memClient.search(query, { user_id: userId, limit: LONG_TERM_MEMORY_LIMIT });
      memories = Array.isArray(searchResult) ? searchResult : (searchResult as any).results || [];
    } else {
      // Recent Memories
      memories = await memClient.getAll({ user_id: userId, limit: LONG_TERM_MEMORY_LIMIT });
    }

    const parsed = memories
      .map((memory: any) => {
        const candidate =
          (typeof memory.memory === "string" && memory.memory) ||
          (typeof memory.data?.memory === "string" && memory.data.memory) ||
          (typeof memory.data === "string" && memory.data) ||
          "";
        return candidate?.toString().trim();
      })
      .filter((text: any): text is string => Boolean(text));

    state.longTermMemories = parsed; // Overwrite with relevant memories
    state.longTermMemoryHydrated = true;
  } catch (error) {
    console.warn("Failed to sync long-term memory from Mem0:", error);
  }
}

export function pushLongTermMemory(userId: string, text: string) {
  const value = text.trim();
  if (!value) {
    return;
  }
  const state = getUserState(userId);
  state.longTermMemories.push(value);
  trimList(state.longTermMemories, LONG_TERM_MEMORY_LIMIT);
  state.longTermMemoryHydrated = true;
}

export async function writeLongTermMemory(userId: string, question: string, finalResponse: string) {
  const summary = finalResponse.trim();
  if (!summary) {
    return;
  }

  const state = getUserState(userId);

  try {
    await memClient.add(
      [
        { role: "user", content: question },
        { role: "assistant", content: summary }
      ],
      {
        user_id: userId,
        metadata: {
          workflow: WORKFLOW_NAME,
          timestamp: new Date().toISOString(),
          idea_backlog: state.founderIdeaBacklog.slice(-5),
          sources: state.researchSourceLog.slice(-5)
        }
      }
    );
    pushLongTermMemory(userId, summary);
  } catch (error) {
    console.warn("Failed to persist long-term memory to Mem0:", error);
  }
}

export async function updateLongTermMemory(userId: string, fieldName: string, oldValue: string, newValue: string) {
  if (!oldValue || !newValue || oldValue === newValue) {
    return;
  }

  try {
    // Search for memories containing the old value
    const memories = await memClient.getAll({ user_id: userId, limit: LONG_TERM_MEMORY_LIMIT });
    
    for (const memory of memories) {
      const memoryId = memory.id;
      const memoryText = 
        (typeof memory.memory === "string" && memory.memory) ||
        (typeof memory.data?.memory === "string" && memory.data.memory) ||
        (typeof memory.data === "string" && memory.data) ||
        "";
      
      // Check if this memory contains the old value
      if (memoryText.toLowerCase().includes(oldValue.toLowerCase())) {
        // Update the memory by adding a new memory that supersedes it
        await memClient.add(
          [
            { role: "user", content: `Update: My ${fieldName} changed from "${oldValue}" to "${newValue}"` },
            { role: "assistant", content: `Updated ${fieldName} to ${newValue}` }
          ],
          {
            user_id: userId,
            metadata: {
              workflow: WORKFLOW_NAME,
              timestamp: new Date().toISOString(),
              update_type: "profile_field_change",
              field: fieldName,
              old_value: oldValue,
              new_value: newValue
            }
          }
        );
        
        console.log(`[Mem0 Update] Updated ${fieldName} from "${oldValue}" to "${newValue}"`);
        break; // Only update once
      }
    }
    
    // Refresh the local memory cache
    await refreshLongTermMemory(userId);
  } catch (error) {
    console.warn(`Failed to update long-term memory for ${fieldName}:`, error);
  }
}
