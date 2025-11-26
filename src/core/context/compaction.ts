/**
 * Context Compaction
 * 
 * Per Anthropic's Context Engineering article:
 * "Compaction is the practice of taking a conversation nearing the context 
 * window limit, summarizing its contents, and reinitiating a new context 
 * window with the summary."
 * 
 * This module provides utilities to:
 * 1. Detect when context is getting too large
 * 2. Summarize conversation history while preserving critical details
 * 3. Clear verbose tool outputs while keeping results
 */

import { Agent, run } from "@openai/agents";
import { getUserState } from "../state/userState.js";

// Approximate token limits (conservative estimates)
const MAX_CONTEXT_TOKENS = 100000; // GPT-4 turbo context
const COMPACTION_THRESHOLD = 0.7; // Trigger at 70% capacity
const CHARS_PER_TOKEN = 4; // Rough estimate

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface CompactionResult {
  compactedHistory: string;
  preservedItems: string[];
  tokensRecovered: number;
}

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if context needs compaction
 */
export function needsCompaction(contextText: string): boolean {
  const tokens = estimateTokens(contextText);
  return tokens > MAX_CONTEXT_TOKENS * COMPACTION_THRESHOLD;
}

/**
 * Extract the most important information from a conversation
 * Preserves:
 * - Architectural decisions
 * - Key user preferences
 * - Unresolved issues
 * - Recent context (last 5 turns)
 */
export function extractCriticalContext(turns: ConversationTurn[]): {
  criticalTurns: ConversationTurn[];
  summaryNeeded: ConversationTurn[];
} {
  const recentCount = 5;
  const recent = turns.slice(-recentCount);
  const older = turns.slice(0, -recentCount);
  
  // Filter older turns for critical content
  const criticalPatterns = [
    /decision|decided|chose|selected/i,
    /important|critical|must|required/i,
    /founder profile|background|experience/i,
    /idea|startup|company/i,
    /goal|objective|target/i,
    /problem|issue|blocker/i,
  ];
  
  const criticalOlder = older.filter(turn => 
    criticalPatterns.some(pattern => pattern.test(turn.content))
  );
  
  const summaryNeeded = older.filter(turn => 
    !criticalPatterns.some(pattern => pattern.test(turn.content))
  );
  
  return {
    criticalTurns: [...criticalOlder, ...recent],
    summaryNeeded
  };
}

/**
 * Clear verbose tool outputs from assistant messages
 * Keeps the result summary but removes raw data dumps
 */
export function clearToolOutputs(text: string): string {
  // Remove large JSON blocks (keep first 200 chars as summary)
  let cleaned = text.replace(
    /```json[\s\S]{500,}?```/g, 
    (match) => {
      const preview = match.slice(0, 200).replace(/```json\s*/, '');
      return `[Tool output truncated - key data: ${preview}...]`;
    }
  );
  
  // Remove verbose search results
  cleaned = cleaned.replace(
    /\[Search Results\][\s\S]{500,}?\[\/Search Results\]/g,
    '[Search results summarized above]'
  );
  
  // Remove repeated status messages
  cleaned = cleaned.replace(
    /(\[Searching\][^\n]*\n){3,}/g,
    '[Multiple searches performed...]\n'
  );
  
  return cleaned;
}

/**
 * Generate a compacted summary of conversation history
 */
export async function compactConversation(
  userId: string,
  turns: ConversationTurn[]
): Promise<CompactionResult> {
  const { criticalTurns, summaryNeeded } = extractCriticalContext(turns);
  
  if (summaryNeeded.length === 0) {
    return {
      compactedHistory: turns.map(t => `${t.role}: ${t.content}`).join('\n\n'),
      preservedItems: [],
      tokensRecovered: 0
    };
  }
  
  const originalTokens = estimateTokens(
    summaryNeeded.map(t => t.content).join('\n')
  );
  
  // Build summary of older turns
  const summaryText = summaryNeeded
    .map(t => `${t.role}: ${clearToolOutputs(t.content).slice(0, 500)}`)
    .join('\n');
  
  // Create a structured summary
  const state = getUserState(userId);
  const preservedItems: string[] = [];
  
  // Extract key decisions
  const decisions = summaryNeeded
    .filter(t => /decision|decided|chose/i.test(t.content))
    .map(t => t.content.slice(0, 200));
  if (decisions.length > 0) {
    preservedItems.push(`Key decisions: ${decisions.join('; ')}`);
  }
  
  // Extract mentioned ideas
  const ideas = state.founderIdeaBacklog.slice(-3);
  if (ideas.length > 0) {
    preservedItems.push(`Ideas discussed: ${ideas.join(', ')}`);
  }
  
  // Build compacted history
  const compactedHistory = [
    '<conversation_summary>',
    `Previous discussion covered: ${summaryNeeded.length} turns`,
    ...preservedItems,
    '</conversation_summary>',
    '',
    '<recent_conversation>',
    ...criticalTurns.map(t => `${t.role}: ${clearToolOutputs(t.content)}`),
    '</recent_conversation>'
  ].join('\n');
  
  const newTokens = estimateTokens(compactedHistory);
  
  return {
    compactedHistory,
    preservedItems,
    tokensRecovered: originalTokens - newTokens
  };
}

/**
 * Smart context builder that auto-compacts when needed
 */
export function buildCompactContext(
  sections: { tag: string; content: string; priority: 'high' | 'medium' | 'low' }[]
): string {
  // Sort by priority
  const sorted = [...sections].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  let context = '';
  let tokenCount = 0;
  const maxTokens = MAX_CONTEXT_TOKENS * COMPACTION_THRESHOLD;
  
  for (const section of sorted) {
    const sectionTokens = estimateTokens(section.content);
    
    if (tokenCount + sectionTokens > maxTokens) {
      // Truncate low priority sections
      if (section.priority === 'low') {
        const remainingTokens = maxTokens - tokenCount;
        const truncatedContent = section.content.slice(0, remainingTokens * CHARS_PER_TOKEN);
        context += `<${section.tag}>\n${truncatedContent}...[truncated]\n</${section.tag}>\n\n`;
        break;
      }
      // Skip medium priority if we're really tight
      if (section.priority === 'medium' && tokenCount > maxTokens * 0.9) {
        continue;
      }
    }
    
    context += `<${section.tag}>\n${section.content}\n</${section.tag}>\n\n`;
    tokenCount += sectionTokens;
  }
  
  return context.trim();
}

