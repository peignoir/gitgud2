import { z } from "zod";
import { OpenAIConversationsSession } from "@openai/agents-openai";

export const summarySchema = z.object({
  stage: z.string().min(1),
  traction: z.string().min(1),
  main_bottleneck: z.string().min(1),
  focus: z.string().min(1)
});

export const founderProfileSchema = z
  .object({
    founder: z.string().optional(),
    location: z.string().optional(),
    background: z.string().optional(),
    experience_tier: z.enum(["first-time", "experienced", "serial"]).optional(),
    funding_history: z.string().optional(),
    exits: z.string().optional(),
    academic: z.string().optional(),
    social_capital: z.string().optional(),
    stage: z.string().optional(),
    motivations: z.string().optional(),
    strengths: z.string().optional(),
    gaps: z.string().optional(),
    working_style: z.string().optional(),
    goals: z.string().optional(),
    loves: z.string().optional(),
    hates: z.string().optional(),
    unfair_advantages: z.string().optional(),
    notes: z.string().optional()
  })
  .partial();

export const routerPlanSchema = z.object({
  mentors: z.array(z.enum(["biz", "fund", "vehicle", "profile"])).min(1),
  reason: z.string().min(1),
  follow_up_question: z.string().optional()
});

export const researchNotesSchema = z.object({
  profile_insights: z.array(z.string()).optional(),
  idea_leads: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional()
});

export const ideationResultSchema = z.object({
  top_ideas: z.array(z.string()).optional(),
  market_trend: z.string().optional(),
  skills_identified: z.array(z.string()).optional(),
  network_edges: z.array(z.string()).optional(),
  user_selected_idea: z.string().optional()
});

export const sprintPlanSchema = z.object({
  tasks: z.array(z.string()),
  goal: z.string().optional()
});

export const vibeceleratorStatusSchema = z.object({
  day: z.number().optional(),
  challenge: z.string().optional(),
  status: z.string().optional()
});

export type MentorLabel = "biz" | "fund" | "vehicle";
export type RouterAgentLabel = MentorLabel | "profile";
export type AgentLabel = RouterAgentLabel | "router" | "synth" | "research" | "pdf" | "ideation" | "sprint" | "vibecelerator";
export type FounderProfile = z.infer<typeof founderProfileSchema>;
export type RouterPlan = z.infer<typeof routerPlanSchema>;
export type ResearchNotes = z.infer<typeof researchNotesSchema>;
export type IdeationResult = z.infer<typeof ideationResultSchema>;
export type SprintPlan = z.infer<typeof sprintPlanSchema>;
export type VibeceleratorStatus = z.infer<typeof vibeceleratorStatusSchema>;

export const LONG_TERM_MEMORY_LIMIT = 50;
export const IDEA_BACKLOG_LIMIT = 20;
export const RESEARCH_SOURCE_LIMIT = 20;

export interface UserState {
  founderProfile: FounderProfile;
  founderIdeaBacklog: string[];
  researchSourceLog: string[];
  longTermMemories: string[];
  longTermMemoryHydrated: boolean;
  conversationSession: OpenAIConversationsSession | null;
  ideationResults?: IdeationResult;
  sprintPlan?: SprintPlan;
  vibeceleratorStatus?: VibeceleratorStatus;
}

export const userStateMap = new Map<string, UserState>();

export function getUserState(userId: string): UserState {
  if (!userStateMap.has(userId)) {
    userStateMap.set(userId, {
      founderProfile: {},
      founderIdeaBacklog: [],
      researchSourceLog: [],
      longTermMemories: [],
      longTermMemoryHydrated: false,
      conversationSession: null
    });
  }
  return userStateMap.get(userId)!;
}

export function trimList(list: string[], limit: number) {
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
}

