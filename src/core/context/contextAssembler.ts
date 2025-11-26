import { 
  founderProfileSnapshot, 
  longTermMemorySnapshot, 
  formattedIdeaBacklog, 
  formattedResearchSources
} from "../state/utils.js";
import { formatScratchpadForContext } from "./scratchpad.js";
import { buildCompactContext, estimateTokens } from "./compaction.js";

/**
 * ContextAssembler
 * 
 * Implements Context Engineering best practices from Anthropic:
 * 1. XML Tagging for clear data separation (<profile>, <memory>, etc.)
 * 2. Modular assembly of context parts with priority levels
 * 3. Token/Length awareness with automatic compaction
 * 4. Scratchpad integration for persistent notes
 * 
 * Key principle: "Find the smallest possible set of high-signal tokens 
 * that maximize the likelihood of the desired outcome."
 */
export class ContextAssembler {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Business context with priority-based compaction
   */
  public assembleBusinessContext(question: string): string {
    const scratchpad = formatScratchpadForContext(this.userId);
    
    return buildCompactContext([
      { tag: "founder_question", content: question, priority: 'high' },
      { tag: "founder_profile", content: founderProfileSnapshot(this.userId), priority: 'high' },
      { tag: "working_notes", content: scratchpad || "(no notes yet)", priority: 'high' },
      { tag: "relevant_memories", content: longTermMemorySnapshot(this.userId), priority: 'medium' },
      { tag: "idea_backlog", content: formattedIdeaBacklog(this.userId), priority: 'medium' },
      { tag: "research_sources", content: formattedResearchSources(this.userId), priority: 'low' }
    ]);
  }

  /**
   * Fundraising context includes business summary
   */
  public assembleFundraisingContext(question: string, bizSummary: string): string {
    const scratchpad = formatScratchpadForContext(this.userId);
    
    return buildCompactContext([
      { tag: "founder_question", content: question, priority: 'high' },
      { tag: "founder_profile", content: founderProfileSnapshot(this.userId), priority: 'high' },
      { tag: "business_context", content: bizSummary || "(not available)", priority: 'high' },
      { tag: "working_notes", content: scratchpad || "(no notes yet)", priority: 'medium' },
      { tag: "relevant_memories", content: longTermMemorySnapshot(this.userId), priority: 'medium' },
      { tag: "research_sources", content: formattedResearchSources(this.userId), priority: 'low' }
    ]);
  }

  /**
   * Router context - minimal, focused on routing decision
   */
  public assembleRouterContext(question: string): string {
    // Router needs minimal context - just enough to make routing decision
    return this.buildXml([
      { tag: "founder_question", content: question },
      { tag: "founder_profile", content: this.getCompactProfile() },
      { tag: "recent_context", content: this.getRecentContext() }
    ]);
  }

  /**
   * Synthesizer context - combines all specialist outputs
   */
  public assembleSynthesizerContext(
    question: string, 
    routerReason: string, 
    specialistOutputs: string
  ): string {
    const scratchpad = formatScratchpadForContext(this.userId);
    
    return buildCompactContext([
      { tag: "founder_question", content: question, priority: 'high' },
      { tag: "founder_profile", content: founderProfileSnapshot(this.userId), priority: 'high' },
      { tag: "specialist_insights", content: specialistOutputs, priority: 'high' },
      { tag: "routing_rationale", content: routerReason, priority: 'medium' },
      { tag: "working_notes", content: scratchpad || "(no notes)", priority: 'medium' },
      { tag: "relevant_memories", content: longTermMemorySnapshot(this.userId), priority: 'low' }
    ]);
  }

  /**
   * Ideation context - emphasizes founder strengths and market trends
   */
  public assembleIdeationContext(question: string): string {
    const scratchpad = formatScratchpadForContext(this.userId);
    
    return buildCompactContext([
      { tag: "founder_question", content: question, priority: 'high' },
      { tag: "founder_profile", content: founderProfileSnapshot(this.userId), priority: 'high' },
      { tag: "previous_ideas", content: formattedIdeaBacklog(this.userId), priority: 'high' },
      { tag: "working_notes", content: scratchpad || "(no notes)", priority: 'medium' },
      { tag: "relevant_memories", content: longTermMemorySnapshot(this.userId), priority: 'low' }
    ]);
  }

  /**
   * Sprint context - focused on execution
   */
  public assembleSprintContext(question: string, selectedIdea?: string): string {
    const scratchpad = formatScratchpadForContext(this.userId);
    
    return buildCompactContext([
      { tag: "sprint_goal", content: question, priority: 'high' },
      { tag: "selected_idea", content: selectedIdea || "(user will specify)", priority: 'high' },
      { tag: "founder_profile", content: this.getCompactProfile(), priority: 'medium' },
      { tag: "working_notes", content: scratchpad || "(no notes)", priority: 'medium' }
    ]);
  }

  /**
   * Get a compact version of the profile (key fields only)
   */
  private getCompactProfile(): string {
    const full = founderProfileSnapshot(this.userId);
    // If profile is short, return as-is
    if (estimateTokens(full) < 200) {
      return full;
    }
    // Otherwise, extract key fields
    const lines = full.split('\n').filter(line => 
      /^(founder|background|experience|stage|goals)/i.test(line.trim())
    );
    return lines.join('\n') || full.slice(0, 800);
  }

  /**
   * Get recent context (last few memories)
   */
  private getRecentContext(): string {
    const memories = longTermMemorySnapshot(this.userId);
    const lines = memories.split('\n').slice(-5);
    return lines.join('\n') || "(no recent context)";
  }

  /**
   * Wraps content in XML tags for clearer LLM parsing.
   */
  private buildXml(parts: { tag: string; content: string }[]): string {
    return parts
      .filter(p => p.content && p.content.trim() !== "")
      .map(p => `<${p.tag}>\n${p.content}\n</${p.tag}>`)
      .join("\n\n");
  }
}

