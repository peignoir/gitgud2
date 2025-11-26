/**
 * Scratchpad / Structured Note-Taking
 * 
 * Per Anthropic's Context Engineering article:
 * "Structured note-taking, or agentic memory, is a technique where the agent 
 * regularly writes notes persisted to memory outside of the context window. 
 * These notes get pulled back into the context window at later times."
 * 
 * This provides persistent memory with minimal overhead, similar to how
 * Claude Code creates a to-do list or maintains a NOTES.md file.
 */

import fs from "node:fs";
import path from "node:path";
import { getUserState } from "../state/userState.js";
import { vectorStoreCacheDir, ensureCacheDir } from "../state/memory.js";

interface ScratchpadEntry {
  timestamp: string;
  category: 'decision' | 'insight' | 'todo' | 'blocker' | 'milestone' | 'note';
  content: string;
  context?: string;
}

interface UserScratchpad {
  userId: string;
  entries: ScratchpadEntry[];
  lastUpdated: string;
}

/**
 * Get scratchpad file path for a user
 */
function getScratchpadPath(userId: string): string {
  return path.resolve(vectorStoreCacheDir, `scratchpad_${userId}.json`);
}

/**
 * Load user's scratchpad
 */
export function loadScratchpad(userId: string): UserScratchpad {
  try {
    ensureCacheDir();
    const filePath = getScratchpadPath(userId);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.warn("Failed to load scratchpad:", error);
  }
  
  return {
    userId,
    entries: [],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Save user's scratchpad
 */
function saveScratchpad(scratchpad: UserScratchpad): void {
  try {
    ensureCacheDir();
    const filePath = getScratchpadPath(scratchpad.userId);
    scratchpad.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(scratchpad, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to save scratchpad:", error);
  }
}

/**
 * Add an entry to the scratchpad
 */
export function addScratchpadEntry(
  userId: string,
  category: ScratchpadEntry['category'],
  content: string,
  context?: string
): void {
  const scratchpad = loadScratchpad(userId);
  
  const entry: ScratchpadEntry = {
    timestamp: new Date().toISOString(),
    category,
    content: content.trim(),
    context
  };
  
  scratchpad.entries.push(entry);
  
  // Keep only last 50 entries
  if (scratchpad.entries.length > 50) {
    scratchpad.entries = scratchpad.entries.slice(-50);
  }
  
  saveScratchpad(scratchpad);
}

/**
 * Get recent entries from scratchpad
 */
export function getRecentEntries(
  userId: string,
  limit: number = 10,
  category?: ScratchpadEntry['category']
): ScratchpadEntry[] {
  const scratchpad = loadScratchpad(userId);
  let entries = scratchpad.entries;
  
  if (category) {
    entries = entries.filter(e => e.category === category);
  }
  
  return entries.slice(-limit);
}

/**
 * Format scratchpad for context injection
 */
export function formatScratchpadForContext(userId: string): string {
  const entries = getRecentEntries(userId, 15);
  
  if (entries.length === 0) {
    return "";
  }
  
  const grouped: Record<string, string[]> = {};
  
  for (const entry of entries) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(entry.content);
  }
  
  const sections: string[] = [];
  
  if (grouped.decision?.length) {
    sections.push(`**Key Decisions:**\n${grouped.decision.map(d => `• ${d}`).join('\n')}`);
  }
  
  if (grouped.milestone?.length) {
    sections.push(`**Milestones:**\n${grouped.milestone.map(m => `✓ ${m}`).join('\n')}`);
  }
  
  if (grouped.blocker?.length) {
    sections.push(`**Current Blockers:**\n${grouped.blocker.map(b => `⚠ ${b}`).join('\n')}`);
  }
  
  if (grouped.todo?.length) {
    sections.push(`**Open Tasks:**\n${grouped.todo.map(t => `☐ ${t}`).join('\n')}`);
  }
  
  if (grouped.insight?.length) {
    sections.push(`**Insights:**\n${grouped.insight.map(i => `💡 ${i}`).join('\n')}`);
  }
  
  if (grouped.note?.length) {
    sections.push(`**Notes:**\n${grouped.note.slice(-5).map(n => `- ${n}`).join('\n')}`);
  }
  
  return sections.join('\n\n');
}

/**
 * Auto-extract and save important information from agent output
 */
export function extractAndSaveNotes(userId: string, agentOutput: string, userQuestion: string): void {
  // Extract decisions
  const decisionPatterns = [
    /(?:decided|decision|chose|selected|going with|will go with)[:\s]+([^.!?]+[.!?])/gi,
    /(?:recommendation|recommend)[:\s]+([^.!?]+[.!?])/gi,
  ];
  
  for (const pattern of decisionPatterns) {
    const matches = agentOutput.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 20 && match[1].length < 200) {
        addScratchpadEntry(userId, 'decision', match[1].trim(), userQuestion);
      }
    }
  }
  
  // Extract action items / todos
  const todoPatterns = [
    /(?:homework|next step|action item|you should|try to)[:\s]+([^.!?]+[.!?])/gi,
    /(?:^|\n)\s*[-•]\s*([A-Z][^.!?\n]+[.!?])/gm,
  ];
  
  for (const pattern of todoPatterns) {
    const matches = agentOutput.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 15 && match[1].length < 150) {
        addScratchpadEntry(userId, 'todo', match[1].trim(), userQuestion);
      }
    }
  }
  
  // Extract blockers mentioned
  const blockerPatterns = [
    /(?:blocker|blocked by|obstacle|challenge|risk)[:\s]+([^.!?]+[.!?])/gi,
  ];
  
  for (const pattern of blockerPatterns) {
    const matches = agentOutput.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 15 && match[1].length < 200) {
        addScratchpadEntry(userId, 'blocker', match[1].trim(), userQuestion);
      }
    }
  }
}

/**
 * Clear scratchpad for a user (on reset)
 */
export function clearScratchpad(userId: string): void {
  try {
    const filePath = getScratchpadPath(userId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn("Failed to clear scratchpad:", error);
  }
}

