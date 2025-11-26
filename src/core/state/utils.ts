import { getUserState, trimList, founderProfileSchema, researchNotesSchema, FounderProfile, ResearchNotes, IDEA_BACKLOG_LIMIT, RESEARCH_SOURCE_LIMIT } from "./userState.js";
import { updateLongTermMemory } from "./memory.js";

export function founderProfileSnapshot(userId: string): string {
  const state = getUserState(userId);
  return Object.keys(state.founderProfile).length > 0 ? JSON.stringify(state.founderProfile, null, 2) : "(no founder profile yet)";
}

export function longTermMemorySnapshot(userId: string, limit = 10): string {
  const state = getUserState(userId);
  if (!state.longTermMemories.length) {
    return "(no long-term memories yet)";
  }
  const recent = state.longTermMemories.slice(-limit);
  return recent.map((memory, index) => `${index + 1}. ${memory}`).join("\n");
}

export function formattedIdeaBacklog(userId: string): string {
  const state = getUserState(userId);
  if (!state.founderIdeaBacklog.length) {
    return "(no idea backlog entries)";
  }
  return state.founderIdeaBacklog.map((idea, index) => `${index + 1}. ${idea}`).join("\n");
}

export function formattedResearchSources(userId: string): string {
  const state = getUserState(userId);
  if (!state.researchSourceLog.length) {
    return "(no research sources yet)";
  }
  return state.researchSourceLog.map((source, index) => `${index + 1}. ${source}`).join("\n");
}

export async function mergeFounderProfile(userId: string, update: FounderProfile | null) {
  if (!update) {
    return;
  }

  const state = getUserState(userId);
  const oldProfile = { ...state.founderProfile };
  
  state.founderProfile = {
    ...state.founderProfile,
    ...Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    )
  };
  
  // Detect changes and update Mem0 for key fields
  const keyFields: (keyof FounderProfile)[] = ['founder', 'location', 'background', 'goals'];
  
  for (const field of keyFields) {
    const oldValue = oldProfile[field];
    const newValue = state.founderProfile[field];
    
    if (oldValue && newValue && oldValue !== newValue) {
      // Field changed - update Mem0
      await updateLongTermMemory(userId, field, oldValue, newValue);
    }
  }
}

export function mergeResearchNotes(userId: string, notes: ResearchNotes | null) {
  if (!notes) {
    return;
  }

  const state = getUserState(userId);

  const newInsights = notes.profile_insights ?? [];
  if (newInsights.length > 0) {
    const existing = state.founderProfile.notes ? `${state.founderProfile.notes}\n` : "";
    state.founderProfile.notes = `${existing}${newInsights.join("\n")}`.trim();
  }

  if (notes.idea_leads) {
    for (const idea of notes.idea_leads) {
      if (idea && !state.founderIdeaBacklog.includes(idea)) {
        state.founderIdeaBacklog.push(idea);
      }
    }
    trimList(state.founderIdeaBacklog, IDEA_BACKLOG_LIMIT);
  }

  if (notes.sources) {
    for (const source of notes.sources) {
      if (source && !state.researchSourceLog.includes(source)) {
        state.researchSourceLog.push(source);
      }
    }
    trimList(state.researchSourceLog, RESEARCH_SOURCE_LIMIT);
  }
}

