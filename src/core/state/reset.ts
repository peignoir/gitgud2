import fs from "node:fs";
import { memClient, getConversationPath } from "./memory.js";
import { userStateMap } from "./userState.js";

export async function resetUserData(userId: string): Promise<{ memoriesCleared: number; success: boolean }> {
  let memoriesCleared = 0;
  
  try {
    // 1. Clear conversation cache
    const userConversationPath = getConversationPath(userId);
    if (fs.existsSync(userConversationPath)) {
      fs.unlinkSync(userConversationPath);
    }

    // 2. Clear Mem0 long-term memory
    try {
      const memories = await memClient.getAll({ user_id: userId, limit: 100 });
      
      for (const memory of memories) {
        if (memory.id) {
          try {
            await memClient.delete(memory.id);
            memoriesCleared++;
          } catch (deleteError) {
            // Memory might already be deleted, continue silently
          }
        }
      }
    } catch (memError) {
      // Continue with reset even if Mem0 deletion fails
    }
    
    // 3. Clear User State
    if (userStateMap.has(userId)) {
      const state = userStateMap.get(userId)!;
      state.founderProfile = {};
      state.founderIdeaBacklog = [];
      state.researchSourceLog = [];
      state.longTermMemories = [];
      state.ideationResults = undefined;
      state.sprintPlan = undefined;
      state.vibeceleratorStatus = undefined;
      state.longTermMemoryHydrated = false;
      state.conversationSession = null;
    }

    console.log(`[Reset] Successfully cleared data for user ${userId} (${memoriesCleared} memories)`);
    return { memoriesCleared, success: true };
  } catch (error) {
    console.error(`[Reset] Failed to clear data for user ${userId}:`, error);
    throw error;
  }
}

