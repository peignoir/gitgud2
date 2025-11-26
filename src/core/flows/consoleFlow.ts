/*
 * Flow: Console Flow (Main Router Logic)
 * 
 * [User Input] -> [Research Check] --(yes)--> [Research Agent]
 *      |
 *      v
 * [Router Agent] --(plan)--> [Parallel Execution]
 *                                   |
 *        +--------------------------+--------------------------+
 *        v                          v                          v
 * [Business Mentor]         [Fundraising Mentor]       [Vehicle Mentor]
 *        |                          |                          |
 *        +--------------------------+--------------------------+
 *                                   |
 *                                   v
 *                         [Synthesizer Agent]
 *                                   |
 *                                   v
 *                           [Long Term Memory]
 */

import { 
  createBusinessMentor, 
  createFundraisingMentor, 
  createVehicleMentor, 
  createRouterAgent, 
  createSynthesizerAgent, 
  createResearchAgent 
} from "../agents/index.js";

import { runFounderProfiler } from "./profileFlow.js";
import { runAgentWithStreaming, announceSection, routerInfoColor, colorThinking, formatLabel } from "../runner.js";
import { isQuietMode } from "../state/config.js";
import { extractJsonBlock } from "../utils/extraction.js";
import { 
  founderProfileSnapshot, 
  longTermMemorySnapshot, 
  mergeResearchNotes
} from "../state/utils.js";
import { writeLongTermMemory } from "../state/memory.js";
import { ensureConversationSession } from "../state/conversation.js";
import { refreshLongTermMemory } from "../state/memory.js";
import { ContextAssembler } from "../context/contextAssembler.js";
import { extractAndSaveNotes } from "../context/scratchpad.js";
import { 
  routerPlanSchema, 
  researchNotesSchema, 
  RouterPlan, 
  MentorLabel, 
  RouterAgentLabel,
  AgentLabel
} from "../state/userState.js";

const ROUTER_KEYWORDS: Record<MentorLabel, string[]> = {
  biz: [
    "idea", "users", "mvp", "product", "growth", "distribution", "cofounder", "acquisition", "retention", "launch", "feedback", "customer", "build", "ship", "pricing"
  ],
  fund: [
    "raise", "fund", "investor", "pitch", "valuation", "round", "seed", "angel", "deck", "dataroom", "runway", "dilution", "term sheet", "fundraising", "investment"
  ],
  vehicle: [
    "rolling fund", "vehicle", "spv", "syndicate", "pledge fund", "emerging manager", "lp", "limited partner", "carry", "2/20", "angel list", "angellist", "fund formation", "lpa", "fund admin", "micro fund", "fund size", "portfolio construction"
  ]
};

const mentorNames: Record<AgentLabel, string> = {
  biz: "YC Business & Growth Mentor",
  fund: "YC Fundraising & Market Strategy Mentor",
  vehicle: "US VC Fund & LP Expert",
  profile: "YC Founder Profiler",
  router: "YC Router",
  synth: "YC Mentor Synthesizer",
  research: "YC Research Scout",
  pdf: "PDF Intake Sentinel",
  ideation: "YC Ideation Partner",
  sprint: "YC Sprint Coach",
  vibecelerator: "9-Day Vibecelerator Coach"
};

function routeMentors(userId: string, question: string): MentorLabel[] {
  const text = question.toLowerCase();
  const matches = (keywords: string[]) => keywords.some((kw) => text.includes(kw));

  let wantsBiz = matches(ROUTER_KEYWORDS.biz);
  let wantsFund = matches(ROUTER_KEYWORDS.fund);
  let wantsVehicle = matches(ROUTER_KEYWORDS.vehicle);

  const profileText = founderProfileSnapshot(userId).toLowerCase();
  if (!wantsFund && /raise|fund|investor|runway|seed|fundraising/.test(profileText)) {
    wantsFund = true;
  }
  if (!wantsBiz && /mvp|users|product|growth|distribution/.test(profileText)) {
    wantsBiz = true;
  }
  if (!wantsVehicle && /lp|vehicle|rolling fund|spv|syndicate|emerging manager/.test(profileText)) {
    wantsVehicle = true;
  }

  if (text.includes("both mentors") || text.includes("all mentors")) {
    wantsBiz = true;
    wantsFund = true;
    wantsVehicle = true;
  }

  const plan: MentorLabel[] = [];
  const preferredOrder: MentorLabel[] = ["vehicle", "fund", "biz"];
  const desired: Record<MentorLabel, boolean> = { biz: wantsBiz, fund: wantsFund, vehicle: wantsVehicle };

  preferredOrder.forEach((label) => {
    if (desired[label]) {
      plan.push(label);
    }
  });

  if (plan.length === 0) {
    plan.push("biz");
  }

  return plan;
}

function fallbackRouterPlan(userId: string, question: string): RouterPlan {
  const mentors = routeMentors(userId, question);
  return {
    mentors: mentors.length > 0 ? mentors : ["biz"],
    reason: "Heuristic fallback based on question keywords."
  };
}

function extractRouterCheck(text: string): string | null {
  const match = text.match(/Router check:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function extractRouterPlan(text: string): RouterPlan | null {
  const block = extractJsonBlock(text, "ROUTER_PLAN");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return routerPlanSchema.parse(parsed);
  } catch {
    return null;
  }
}

async function runRouterDecision(userId: string, question: string): Promise<RouterPlan> {
  const routerAgent = await createRouterAgent();
  const contextAssembler = new ContextAssembler(userId);
  const routerInput = contextAssembler.assembleRouterContext(question);

  const { fullText } = await runAgentWithStreaming(routerAgent, routerInput, "router", userId);
  const checkLine = extractRouterCheck(fullText);
  if (checkLine) {
    console.log(`${formatLabel("router")} ${colorThinking("router", checkLine)}`);
  }

  const plan = extractRouterPlan(fullText);
  if (plan && plan.mentors.length > 0) {
    return plan;
  }
  return fallbackRouterPlan(userId, question);
}

const researchKeywords = [
  "search", "lookup", "look up", "google", "blog", "article", "profile", "linkedin", "twitter", "github", "website", "web", "news", "press", "read"
];

function needsResearch(question: string): boolean {
  const text = question.toLowerCase();
  return researchKeywords.some((kw) => text.includes(kw));
}

function extractResearchNotes(text: string) {
  const block = extractJsonBlock(text, "RESEARCH_NOTES");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return researchNotesSchema.parse(parsed);
  } catch {
    return null;
  }
}

async function runResearchAgent(userId: string, question: string): Promise<void> {
  const researchAgent = await createResearchAgent();
  const contextAssembler = new ContextAssembler(userId);
  
  // Research uses the Business context layout for now as it's comprehensive
  const prompt = contextAssembler.assembleBusinessContext(question + "\nTask: Use web search to gather fresh intel and summarize key facts.");

  const { fullText } = await runAgentWithStreaming(researchAgent, prompt, "research", userId);
  const notes = extractResearchNotes(fullText);
  mergeResearchNotes(userId, notes);
}

function extractSummaryFromBiz(text: string): string {
  return extractJsonBlock(text, "SUMMARY");
}

async function runSynthesizer(
  userId: string,
  question: string,
  routerPlan: RouterPlan,
  mentorOutputs: Partial<Record<AgentLabel, string>>
) {
  const synthesizerAgent = await createSynthesizerAgent();
  const contextAssembler = new ContextAssembler(userId);

  const specialistSections = routerPlan.mentors
    .map((label) => `${mentorNames[label]}:\n${mentorOutputs[label as AgentLabel]?.trim() || "(no output)"}\n`)
    .join("\n");

  const synthInput = contextAssembler.assembleSynthesizerContext(question, routerPlan.reason, specialistSections);

  const { fullText } = await runAgentWithStreaming(synthesizerAgent, synthInput, "synth", userId);
  return fullText;
}

export async function runConsoleFlow(userId: string, question: string) {
  await ensureConversationSession(userId);
  
  // Improved Context Engineering: Use Semantic Search to hydrate memory based on the question
  await refreshLongTermMemory(userId, question);
  
  if (needsResearch(question)) {
    await runResearchAgent(userId, question);
  }
  
  const routerPlan = await runRouterDecision(userId, question);
  await runFounderProfiler(userId, question);
  
  const mentorsToRun = Array.from(new Set(routerPlan.mentors)) as RouterAgentLabel[];
  const activeMentors = mentorsToRun.filter((m) => m !== "profile") as MentorLabel[];

  if (!isQuietMode()) {
    const planDescription = mentorsToRun.join(" + ");
    console.log(routerInfoColor(`Router decision: ${planDescription}`));
    console.log(routerInfoColor(`Reason: ${routerPlan.reason}`));
    if (routerPlan.follow_up_question) {
      console.log(routerInfoColor(`Router follow-up: ${routerPlan.follow_up_question}`));
    }
  } else if (routerPlan.follow_up_question) {
    console.log(`${formatLabel("router")} ${colorThinking("router", routerPlan.follow_up_question)}`);
  }

  if (activeMentors.length === 0 && !mentorsToRun.includes("profile")) {
    activeMentors.push("biz");
  }

  let bizSummaryBlock = "";
  const mentorOutputs: Partial<Record<AgentLabel, string>> = {};
  const contextAssembler = new ContextAssembler(userId);

  for (const mentor of activeMentors) {
    if (mentor === "biz") {
      announceSection("biz", "YC Business & Growth Mentor");
      const bizInput = contextAssembler.assembleBusinessContext(question);
      const businessGrowthMentor = await createBusinessMentor();
      const { fullText } = await runAgentWithStreaming(businessGrowthMentor, bizInput, "biz", userId);
      mentorOutputs.biz = fullText;
      bizSummaryBlock = extractSummaryFromBiz(fullText);
    } else if (mentor === "fund") {
      announceSection("fund", "YC Fundraising & Market Strategy Mentor");
      const fundraisingInput = contextAssembler.assembleFundraisingContext(question, bizSummaryBlock);
      const fundraisingMentor = await createFundraisingMentor();
      const { fullText } = await runAgentWithStreaming(fundraisingMentor, fundraisingInput, "fund", userId);
      mentorOutputs.fund = fullText;
    } else if (mentor === "vehicle") {
      announceSection("vehicle", "US VC Fund & LP Expert");
      // Vehicle mentor uses fundraising context structure which includes biz summary
      const vehicleInput = contextAssembler.assembleFundraisingContext(question, bizSummaryBlock);
      const vehicleMentor = await createVehicleMentor();
      const { fullText } = await runAgentWithStreaming(vehicleMentor, vehicleInput, "vehicle", userId);
      mentorOutputs.vehicle = fullText;
    }
  }

  const finalResponse = await runSynthesizer(
    userId,
    question,
    { ...routerPlan, mentors: mentorsToRun as any }, 
    mentorOutputs
  );
  
  // Context Engineering: Extract and save important notes from the response
  extractAndSaveNotes(userId, finalResponse, question);
  
  await writeLongTermMemory(userId, question, finalResponse);
}
