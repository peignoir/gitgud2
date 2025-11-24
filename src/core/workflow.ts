
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Agent, run, tool } from "@openai/agents";
import {
  setDefaultOpenAIKey,
  webSearchTool,
  fileSearchTool,
  OpenAIConversationsSession,
  startOpenAIConversationsSession
} from "@openai/agents-openai";
import { MemoryClient } from "mem0";
import OpenAI from "openai";
import { z } from "zod";
import { getPrompt, initializePrompts, PromptKey } from "./prompts.js";

const WORKFLOW_NAME = "yc_mentor_workflow";
const cwd = process.cwd();
const mentorGuidePath = path.resolve(cwd, "docs", "yc_mentor_guide.md");
const vectorStoreCacheDir = path.resolve(cwd, ".cache");
const vectorStoreCachePath = path.resolve(vectorStoreCacheDir, "yc_vector_store.json");

const summarySchema = z.object({
  stage: z.string().min(1),
  traction: z.string().min(1),
  main_bottleneck: z.string().min(1),
  focus: z.string().min(1)
});

const founderProfileSchema = z
  .object({
    founder: z.string().optional(),
    background: z.string().optional(),
    stage: z.string().optional(),
    motivations: z.string().optional(),
    strengths: z.string().optional(),
    gaps: z.string().optional(),
    working_style: z.string().optional(),
    goals: z.string().optional(),
    notes: z.string().optional()
  })
  .partial();

const routerPlanSchema = z.object({
  mentors: z.array(z.enum(["biz", "fund", "vehicle", "profile"])).min(1),
  reason: z.string().min(1),
  follow_up_question: z.string().optional()
});

const researchNotesSchema = z.object({
  profile_insights: z.array(z.string()).optional(),
  idea_leads: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional()
});

const ideationResultSchema = z.object({
  top_ideas: z.array(z.string()).optional(),
  market_trend: z.string().optional(),
  user_selected_idea: z.string().optional()
});

const sprintPlanSchema = z.object({
  tasks: z.array(z.string()),
  goal: z.string().optional()
});

const vibeceleratorStatusSchema = z.object({
  day: z.number().optional(),
  challenge: z.string().optional(),
  status: z.string().optional()
});

type MentorLabel = "biz" | "fund" | "vehicle";
type RouterAgentLabel = MentorLabel | "profile";
type AgentLabel = RouterAgentLabel | "router" | "synth" | "research" | "pdf" | "ideation" | "sprint" | "vibecelerator";
type FounderProfile = z.infer<typeof founderProfileSchema>;
type RouterPlan = z.infer<typeof routerPlanSchema>;
type ResearchNotes = z.infer<typeof researchNotesSchema>;
type IdeationResult = z.infer<typeof ideationResultSchema>;
type SprintPlan = z.infer<typeof sprintPlanSchema>;
type VibeceleratorStatus = z.infer<typeof vibeceleratorStatusSchema>;

const colorize = (code: string) => (text: string) => `\u001b[${code}m${text}\u001b[0m`;

const labelStyles: Record<
  AgentLabel,
  { tag: string; answer: (text: string) => string; thinking: (text: string) => string; heading: (text: string) => string }
> = {
  profile: {
    tag: colorize("1;32")("[profile]"),
    answer: colorize("32"),
    thinking: colorize("2;32"),
    heading: colorize("1;32")
  },
  biz: {
    tag: colorize("1;36")("[biz]"),
    answer: colorize("36"),
    thinking: colorize("2;36"),
    heading: colorize("1;36")
  },
  fund: {
    tag: colorize("1;35")("[fund]"),
    answer: colorize("35"),
    thinking: colorize("2;35"),
    heading: colorize("1;35")
  },
  vehicle: {
    tag: colorize("1;34")("[vehicle]"),
    answer: colorize("34"),
    thinking: colorize("2;34"),
    heading: colorize("1;34")
  },
  router: {
    tag: colorize("1;33")("[router]"),
    answer: colorize("33"),
    thinking: colorize("2;33"),
    heading: colorize("1;33")
  },
  synth: {
    tag: colorize("1;37")("[mentor]"),
    answer: colorize("37"),
    thinking: colorize("2;37"),
    heading: colorize("1;37")
  },
  research: {
    tag: colorize("1;94")("[research]"),
    answer: colorize("94"),
    thinking: colorize("2;94"),
    heading: colorize("1;94")
  },
  pdf: {
    tag: colorize("1;96")("[pdf]"),
    answer: colorize("96"),
    thinking: colorize("2;96"),
    heading: colorize("1;96")
  },
  ideation: {
    tag: colorize("1;95")("[idea]"),
    answer: colorize("95"),
    thinking: colorize("2;95"),
    heading: colorize("1;95")
  },
  sprint: {
    tag: colorize("1;91")("[sprint]"),
    answer: colorize("91"),
    thinking: colorize("2;91"),
    heading: colorize("1;91")
  },
  vibecelerator: {
    tag: colorize("1;93")("[vibe]"),
    answer: colorize("93"),
    thinking: colorize("2;93"),
    heading: colorize("1;93")
  }
};

const routerInfoColor = colorize("38;5;208");
const gray = colorize("90");
const errorColor = colorize("31");
const SLASH_COMMANDS = ["/help", "/quiet"];

let quietMode = false;

function ensureCacheDir() {
  if (!fs.existsSync(vectorStoreCacheDir)) {
    fs.mkdirSync(vectorStoreCacheDir, { recursive: true });
  }
}

function todayTag(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadCachedVectorStoreId(): string | null {
  try {
    if (!fs.existsSync(vectorStoreCachePath)) {
      return null;
    }
    const raw = fs.readFileSync(vectorStoreCachePath, "utf8");
    const parsed = JSON.parse(raw) as { vectorStoreId?: string; date?: string };
    if (parsed.vectorStoreId && parsed.date === todayTag()) {
      console.log(routerInfoColor(`Reusing cached vector store ${parsed.vectorStoreId} (created ${parsed.date}).`));
      return parsed.vectorStoreId;
    }
  } catch (error) {
    console.warn("Failed to load vector store cache, will re-index.", error);
  }
  return null;
}

function saveCachedVectorStoreId(vectorStoreId: string) {
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

function getConversationPath(userId: string): string {
  return path.resolve(vectorStoreCacheDir, `conversation_${userId}.json`);
}

function loadConversationIdFromCache(userId: string): string | null {
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

function saveConversationIdToCache(userId: string, conversationId: string) {
  try {
    ensureCacheDir();
    const conversationCachePath = getConversationPath(userId);
    fs.writeFileSync(conversationCachePath, JSON.stringify({ conversationId }, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to persist conversation cache:", error);
  }
}

function clearConversationCache(userId: string) {
  try {
    const conversationCachePath = getConversationPath(userId);
    if (fs.existsSync(conversationCachePath)) {
      fs.unlinkSync(conversationCachePath);
    }
  } catch (error) {
    console.warn("Failed to clear conversation cache:", error);
  }
}

function formatLabel(label: AgentLabel): string {
  return labelStyles[label]?.tag ?? `[${label}]`;
}

function colorAnswer(label: AgentLabel, text: string): string {
  return labelStyles[label]?.answer(text) ?? text;
}

function colorThinking(label: AgentLabel, text: string): string {
  return labelStyles[label]?.thinking(text) ?? text;
}

function heading(label: AgentLabel, text: string): string {
  return labelStyles[label]?.heading(text) ?? text;
}

function printHelp() {
  console.log("");
  console.log("Slash commands:");
  console.log("/help   - Show this message");
  console.log("/quiet  - Toggle quiet mode (currently " + (quietMode ? "ON" : "OFF") + ")");
  console.log("Tip: type '/' then press Tab to autocomplete available commands.");
  console.log("");
}

function handleSlashCommand(line: string): boolean {
  const [commandRaw] = line.trim().split(/\s+/, 1);
  const command = commandRaw.toLowerCase();

  switch (command) {
    case "/help":
      printHelp();
      return true;
    case "/quiet":
      quietMode = !quietMode;
      console.log(`Quiet mode ${quietMode ? "enabled" : "disabled"}.`);
      return true;
    case "/":
    case "":
      printHelp();
      return true;
    default:
      console.log(`Unknown command "${line}". Type /help for available commands.`);
      return true;
  }
}

export function slashCompleter(line: string): [string[], string] {
  if (!line.startsWith("/")) {
    return [[], line];
  }

  const hits = SLASH_COMMANDS.filter((cmd) => cmd.startsWith(line));
  return [hits.length > 0 ? hits : SLASH_COMMANDS, line];
}

function announceSection(label: AgentLabel, title: string) {
  if (quietMode) {
    return;
  }
  console.log(heading(label, `\n=== ${title} ===\n`));
}

const apiKey = process.env.OPENAI_API_KEY;
const mentorFileId = process.env.YC_MENTOR_FILE_ID;
const mem0ApiKey = process.env.MEM0_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Please set it before running the workflow.");
  process.exit(1);
}

if (!mentorFileId) {
  console.error("Missing YC_MENTOR_FILE_ID. Set it to the uploaded mentor guide file id.");
  process.exit(1);
}

if (!mem0ApiKey) {
  console.error("Missing MEM0_API_KEY. Please set it to use long-term memory via Mem0.");
  process.exit(1);
}

if (!tavilyApiKey) {
  console.error("Missing TAVILY_API_KEY. Please set it to enable Tavily search.");
  process.exit(1);
}

setDefaultOpenAIKey(apiKey);
const openai = new OpenAI({ apiKey });
const memClient = new MemoryClient({ apiKey: mem0ApiKey });
const mentorGuideFileId = mentorFileId!;

let mentorGuideText: string;
try {
  mentorGuideText = fs.readFileSync(mentorGuidePath, "utf8");
} catch (error) {
  console.error(`Unable to read mentor guide at ${mentorGuidePath}. Ensure the file exists.`);
  console.error(error);
  process.exit(1);
}

const mentorGuideSummary = summarizeGuide(mentorGuideText);
initializePrompts({ mentorGuideSummary });

let resolvedVectorStoreId: string | null = null;

let businessGrowthMentor: Agent;
let fundraisingMentor: Agent;
let vehicleMentor: Agent;
let pdfSummaryAgent: Agent;
let founderProfiler: Agent;
let routerAgent: Agent;
let synthesizerAgent: Agent;
let researchAgent: Agent;
let ideationMentor: Agent;
let sprintCoach: Agent;
let vibeceleratorCoach: Agent;

// Per-user state management
const userStateMap = new Map<string, {
  founderProfile: FounderProfile;
  founderIdeaBacklog: string[];
  researchSourceLog: string[];
  longTermMemories: string[];
  longTermMemoryHydrated: boolean;
  conversationSession: OpenAIConversationsSession | null;
  ideationResults?: IdeationResult;
  sprintPlan?: SprintPlan;
  vibeceleratorStatus?: VibeceleratorStatus;
}>();

const LONG_TERM_MEMORY_LIMIT = 50;
const IDEA_BACKLOG_LIMIT = 20;
const RESEARCH_SOURCE_LIMIT = 20;

function getUserState(userId: string) {
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

let mentorsInitialized = false;


function summarizeGuide(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const maxLength = 600;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function extractJsonBlock(text: string, marker: string): string {
  const regex = new RegExp(`\`\`\`json\\s+${marker}\\s*([\\s\\S]*?)\`\`\``, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractSummaryFromBiz(text: string): string {
  return extractJsonBlock(text, "SUMMARY");
}

function parseBizSummary(summaryText: string) {
  if (!summaryText) {
    return null;
  }

  try {
    const parsed = JSON.parse(summaryText);
    return summarySchema.parse(parsed);
  } catch {
    return null;
  }
}

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

async function mergeFounderProfile(userId: string, update: FounderProfile | null) {
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

function founderProfileSnapshot(userId: string): string {
  const state = getUserState(userId);
  return Object.keys(state.founderProfile).length > 0 ? JSON.stringify(state.founderProfile, null, 2) : "(no founder profile yet)";
}

function trimList(list: string[], limit: number) {
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
}

function longTermMemorySnapshot(userId: string, limit = 10): string {
  const state = getUserState(userId);
  if (!state.longTermMemories.length) {
    return "(no long-term memories yet)";
  }
  const recent = state.longTermMemories.slice(-limit);
  return recent.map((memory, index) => `${index + 1}. ${memory}`).join("\n");
}

function formattedIdeaBacklog(userId: string): string {
  const state = getUserState(userId);
  if (!state.founderIdeaBacklog.length) {
    return "(no idea backlog entries)";
  }
  return state.founderIdeaBacklog.map((idea, index) => `${index + 1}. ${idea}`).join("\n");
}

function formattedResearchSources(userId: string): string {
  const state = getUserState(userId);
  if (!state.researchSourceLog.length) {
    return "(no research sources yet)";
  }
  return state.researchSourceLog.map((source, index) => `${index + 1}. ${source}`).join("\n");
}

type TavilyParameters = {
  query: string;
  topic: string;
  maxResults: number;
  searchDepth: "basic" | "advanced";
  includeAnswer: boolean;
};

const tavilySearchTool = tool({
  name: "tavily_search",
  description:
    "Use Tavily to search the public web (articles, blogs, LinkedIn profiles, news). Provide the search intent and it returns summarized highlights plus source URLs.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        minLength: 4,
        description: "Describe what to search for; include entity names, topics, or questions."
      },
      topic: {
        type: "string",
        description: "Optional extra context (e.g., 'fundraising', 'team background')."
      },
      maxResults: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "How many Tavily results to include."
      },
      searchDepth: {
        type: "string",
        enum: ["basic", "advanced"],
        default: "basic",
        description: "Use 'advanced' for deeper research (slower)."
      },
      includeAnswer: {
        type: "boolean",
        default: true,
        description: "Include Tavily's synthesized answer."
      }
    },
    required: ["query", "topic", "maxResults", "searchDepth", "includeAnswer"],
    additionalProperties: false
  },
  async execute({ query, topic, maxResults, searchDepth, includeAnswer }: TavilyParameters) {
    const body = {
      api_key: tavilyApiKey,
      query: topic ? `${topic}: ${query}` : query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answers: includeAnswer,
      include_images: false,
      include_raw_content: false
    };

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const lines: string[] = [];
    if (data.answer && includeAnswer) {
      lines.push(`Tavily summary: ${data.answer}`);
    }

    if (Array.isArray(data.results)) {
      data.results.slice(0, maxResults).forEach((result, index) => {
        const title = result.title ?? `Result ${index + 1}`;
        const url = result.url ?? "";
        const snippet = result.content?.slice(0, 280) ?? "";
        lines.push(`${index + 1}. ${title}\n${snippet}${url ? `\nSource: ${url}` : ""}`);
      });
    }

    return lines.join("\n\n") || "No Tavily results returned.";
  },
  errorFunction: (_context: unknown, error: unknown) =>
    `Tavily search failed: ${error instanceof Error ? error.message : String(error)}`
});

function extractRouterCheck(text: string): string | null {
  const match = text.match(/Router check:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function extractRouterPlan(text: string): RouterPlan | null {
  const block = extractJsonBlock(text, "ROUTER_PLAN");
  if (!block) {
    return null;
  }
  try {
    const parsed = JSON.parse(block);
    return routerPlanSchema.parse(parsed);
  } catch {
    return null;
  }
}

const ROUTER_KEYWORDS: Record<MentorLabel, string[]> = {
  biz: [
    "idea",
    "users",
    "mvp",
    "product",
    "growth",
    "distribution",
    "cofounder",
    "acquisition",
    "retention",
    "launch",
    "feedback",
    "customer",
    "build",
    "ship",
    "pricing"
  ],
  fund: [
    "raise",
    "fund",
    "investor",
    "pitch",
    "valuation",
    "round",
    "seed",
    "angel",
    "deck",
    "dataroom",
    "runway",
    "dilution",
    "term sheet",
    "fundraising",
    "investment"
  ],
  vehicle: [
    "rolling fund",
    "vehicle",
    "spv",
    "syndicate",
    "pledge fund",
    "emerging manager",
    "lp",
    "limited partner",
    "carry",
    "2/20",
    "angel list",
    "angellist",
    "fund formation",
    "lpa",
    "fund admin",
    "micro fund",
    "fund size",
    "portfolio construction"
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

function buildBusinessInput(userId: string, question: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(userId),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(userId),
    "",
    "Recent research sources:",
    formattedResearchSources(userId)
  ].join("\n");
}

function buildFundraisingInput(userId: string, question: string, bizSummary: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
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
    "Summary from Business & Growth Mentor (stage, traction, bottleneck, focus):",
    bizSummary || "(business mentor not run yet; infer from founder question and profile)"
  ].join("\n");
}

function buildVehicleInput(userId: string, question: string, bizSummary: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
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
    "Summary from Business & Growth Mentor (if available):",
    bizSummary || "(business mentor not run yet; infer from question/profile)",
    "",
    "Task:",
    "- Decide if the GP should pursue a traditional fund, rolling fund, SPV/syndicate, pledge fund, flexible VC model, or hybrid.",
    "- Explain costs, economics, and admin considerations.",
    "- Outline LP segments, ticket sizes, and expectations.",
    "- Provide fund math, portfolio construction, and LP fundraising plan."
  ].join("\n");
}

function buildPdfSummaryInput(fileName: string): string {
  return [
    "A new PDF has been uploaded to the knowledge base.",
    `File name: ${fileName}`,
    "",
    "Task:",
    "- Use File Search to read this PDF.",
    "- Provide 3–5 short bullets summarizing the document's purpose, key sections, and any stats or frameworks that YC mentors should know.",
    "- Mention the publication date/year if visible.",
    "- If the PDF cannot be read, state that clearly and suggest checking the upload."
  ].join("\n");
}

async function initializeMentors() {
  if (mentorsInitialized) {
    return;
  }
  console.log("Preparing YC mentor agents (web + file search)...");
  const vectorStoreId = await resolveVectorStoreId();
  const web = webSearchTool();
  const filesTool = fileSearchTool(vectorStoreId);
  const tavilyTool = tavilySearchTool;

  businessGrowthMentor = new Agent({
    name: "YC Business & Growth Mentor",
    model: "gpt-5.1",
    tools: [web, filesTool, tavilyTool],
    instructions: getPrompt("biz")
  });

  fundraisingMentor = new Agent({
    name: "YC Fundraising & Market Strategy Mentor",
    model: "gpt-5.1",
    tools: [web, filesTool, tavilyTool],
    instructions: getPrompt("fund")
  });

  vehicleMentor = new Agent({
    name: "US VC Fund & LP Expert",
    model: "gpt-5.1",
    tools: [web, filesTool, tavilyTool],
    instructions: getPrompt("vehicle")
  });

  founderProfiler = new Agent({
    name: "YC Founder Profiler",
    model: "gpt-5.1",
    tools: [filesTool, web, tavilyTool],
    instructions: getPrompt("profile")
  });

  routerAgent = new Agent({
    name: "YC Router",
    model: "gpt-5.1",
    tools: [filesTool, web, tavilyTool],
    instructions: getPrompt("router")
  });

  synthesizerAgent = new Agent({
    name: "YC Mentor Synthesizer",
    model: "gpt-5.1",
    tools: [filesTool, web, tavilyTool],
    instructions: getPrompt("synth")
  });

  researchAgent = new Agent({
    name: "YC Research Scout",
    model: "gpt-5.1",
    tools: [tavilyTool, web, filesTool],
    instructions: getPrompt("research")
  });

  ideationMentor = new Agent({
    name: "YC Ideation Partner",
    model: "gpt-5.1",
    tools: [tavilyTool, web, filesTool],
    instructions: getPrompt("ideation")
  });

  sprintCoach = new Agent({
    name: "YC Sprint Coach",
    model: "gpt-5.1",
    tools: [web, filesTool],
    instructions: getPrompt("sprint")
  });

  vibeceleratorCoach = new Agent({
    name: "9-Day Vibecelerator Coach",
    model: "gpt-5.1",
    tools: [web, filesTool],
    instructions: getPrompt("vibecelerator")
  });

  pdfSummaryAgent = new Agent({
    name: "PDF Intake Sentinel",
    model: "gpt-5.1",
    tools: [filesTool, web],
    instructions: [
      "You summarize newly uploaded PDFs for the YC Mentor workflow.",
      "When prompted, assume the referenced PDF was just added to the shared vector store.",
      "Use File Search to read the PDF contents and produce a concise 3–5 bullet summary that confirms:",
      "- What the document is (title, topic, author if available).",
      "- Key sections or findings that matter for YC mentors.",
      "- Any data freshness (year) or notable caveats.",
      "If the PDF cannot be parsed, say so explicitly and suggest re-uploading.",
      "Keep the tone factual and under 120 words."
    ].join("\n")
  });

  console.log("Mentors ready.");
  mentorsInitialized = true;
}

async function resolveVectorStoreId(): Promise<string> {
  if (resolvedVectorStoreId) {
    return resolvedVectorStoreId;
  }
  const existingVectorStoreId = process.env.YC_MENTOR_VECTOR_STORE_ID?.trim();
  if (existingVectorStoreId) {
    resolvedVectorStoreId = existingVectorStoreId;
    return existingVectorStoreId;
  }

  const cachedId = loadCachedVectorStoreId();
  if (cachedId) {
    resolvedVectorStoreId = cachedId;
    return cachedId;
  }

  console.log("Indexing YC mentor guide for File Search...");
  const vectorStore = await openai.vectorStores.create({
    name: `yc-mentor-guide-${Date.now()}`
  });

  const batch = await openai.vectorStores.fileBatches.create(vectorStore.id, {
    file_ids: [mentorGuideFileId]
  });

  const finalBatch = await openai.vectorStores.fileBatches.poll(vectorStore.id, batch.id);

  if (finalBatch.status !== "completed") {
    throw new Error(`Vector store ingestion did not complete successfully (status: ${finalBatch.status}).`);
  }

  if ((finalBatch.file_counts?.failed ?? 0) > 0) {
    throw new Error("Vector store ingestion failed for the mentor guide file.");
  }

  console.log(
    `Vector store ready (${vectorStore.id}). Set YC_MENTOR_VECTOR_STORE_ID to reuse it next run.`
  );
  saveCachedVectorStoreId(vectorStore.id);
  resolvedVectorStoreId = vectorStore.id;

  return vectorStore.id;
}

export async function getVectorStoreId(): Promise<string> {
  return resolveVectorStoreId();
}

export async function summarizePdfUpload(fileName: string): Promise<string> {
  if (!pdfSummaryAgent) {
    throw new Error("PDF summary agent is not initialized.");
  }
  const input = buildPdfSummaryInput(fileName);
  const { fullText } = await runAgentWithStreaming(pdfSummaryAgent, input, "pdf", "default_user");
  return fullText.trim();
}

const spinnerFrames = ["|", "/", "-", "\\"];

function startSpinner(label: AgentLabel, text: string): NodeJS.Timeout | (() => void) {
  let frame = 0;
  if (!quietMode) {
    console.log(`${formatLabel(label)} ${colorThinking(label, text)}`);
    return () => {};
  }

  process.stdout.write(`${formatLabel(label)} ${colorThinking(label, `${spinnerFrames[frame]} ${text}`)}`);
  return setInterval(() => {
    frame = (frame + 1) % spinnerFrames.length;
    process.stdout.write(`\r${formatLabel(label)} ${colorThinking(label, `${spinnerFrames[frame]} ${text}`)}`);
  }, 120);
}

function stopSpinner(timer: NodeJS.Timeout | (() => void)) {
  if (typeof timer === "function") {
    timer();
    return;
  }
  clearInterval(timer);
  if (quietMode) {
    process.stdout.write("\r\x1b[K");
  }
}

async function runAgentWithStreaming(agent: Agent, input: string, label: AgentLabel, userId: string): Promise<{ fullText: string }> {
  const verbose = !quietMode;
  const streamAnswers = !quietMode;
  const spinner = startSpinner(label, "thinking...");

  const stream = await getAgentStream(agent, input, label, userId);
  let fullText = "";

  const handleTextDelta = (delta: string) => {
    fullText += delta;
    if (streamAnswers) {
      process.stdout.write(colorAnswer(label, delta));
    }
  };

  for await (const event of stream as AsyncIterable<any>) {
    switch (event.type) {
      case "response_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${colorThinking(label, "answer streaming...")}`);
        }
        break;
      case "response_done":
        if (verbose) {
          console.log(`${formatLabel(label)} ${colorThinking(label, "answer completed")}`);
        }
        break;
      case "step_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`step started: ${event.step?.name ?? "step"}`)}`);
        }
        break;
      case "tool_started":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`tool started: ${event.toolCall?.toolName ?? "tool"}`)}`);
        }
        break;
      case "tool_completed":
        if (verbose) {
          console.log(`${formatLabel(label)} ${gray(`tool completed: ${event.toolCall?.toolName ?? "tool"}`)}`);
        }
        break;
      case "output_text_delta":
        handleTextDelta(event.delta);
        break;
      case "raw_model_stream_event": {
        const data = event.data as Record<string, unknown> | undefined;
        if (!data) {
          break;
        }
        const dataType =
          typeof (data as { type?: string }).type === "string" ? (data as { type?: string }).type : undefined;

        if (dataType === "output_text_delta" && typeof (data as { delta?: string }).delta === "string") {
          handleTextDelta((data as { delta: string }).delta);
          break;
        }

        if (dataType === "reasoning" && verbose) {
          logReasoning(label, data);
        }
        break;
      }
      case "error":
        console.error(`${formatLabel(label)} ${errorColor(String(event.error))}`);
        break;
      default:
        break;
    }
  }

  stopSpinner(spinner);

  if (streamAnswers) {
    if (!fullText.endsWith("\n")) {
      process.stdout.write("\n");
    }
  } else {
    const trimmed = fullText.trim();
    if (trimmed && label === "synth") {
      console.log(`\n${trimmed}\n`);
    }
  }

  return { fullText };
}

function logReasoning(label: AgentLabel, data: Record<string, unknown>) {
  if (quietMode) {
    return;
  }
  const rawContent = Array.isArray((data as any)?.rawContent)
    ? ((data as any).rawContent as Array<{ text?: string }>)
    : [];
  const structuredContent = Array.isArray((data as any)?.content)
    ? ((data as any).content as Array<{ text?: string }>)
    : [];

  const rawText = rawContent.map((item) => item.text ?? "").join(" ").trim();
  const structuredText = structuredContent.map((item) => item.text ?? "").join(" ").trim();
  const message = rawText || structuredText;

  const thinkingMessage = message ? `thinking: ${message}` : "thinking...";
  console.log(`${formatLabel(label)} ${colorThinking(label, thinkingMessage)}`);
}

async function runFounderProfiler(userId: string, question: string, hasExistingMemory: boolean = false) {
  if (!founderProfiler) {
    return;
  }

  if (!quietMode) {
    console.log(heading("profile", "\n=== YC Founder Profiler ===\n"));
  }
  
  const profileSnapshot = founderProfileSnapshot(userId);
  const isReturningUser = hasExistingMemory && profileSnapshot !== "(no founder profile yet)";
  
  const profilerInput = [
    "Founder question:",
    question,
    "",
    isReturningUser ? "RETURNING USER - Existing profile detected:" : "NEW USER - No existing profile:",
    "Existing founder profile snapshot (JSON):",
    profileSnapshot,
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
    isReturningUser 
      ? "Task: This is a RETURNING USER. Welcome them back briefly, show their profile summary, and ask if they want to update anything or continue. Output READY immediately with their existing profile JSON."
      : "Task: This is a NEW USER. Update the profile with any new signals, highlight risks/opportunities, list clarifying questions, and output the JSON block as specified."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(founderProfiler, profilerInput, "profile", userId);
  const profileUpdate = extractFounderProfile(fullText);
  await mergeFounderProfile(userId, profileUpdate);
}

function fallbackRouterPlan(userId: string, question: string): RouterPlan {
  const mentors = routeMentors(userId, question);
  return {
    mentors: mentors.length > 0 ? mentors : ["biz"],
    reason: "Heuristic fallback based on question keywords."
  };
}

async function runRouterDecision(userId: string, question: string): Promise<RouterPlan> {
  if (!routerAgent) {
    return fallbackRouterPlan(userId, question);
  }

  const routerInput = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
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
    "Task:",
    "- Provide a one-sentence line starting with 'Router check:' that confirms or reframes the user's ask.",
    "- Then output the JSON block described in your instructions."
  ].join("\n");

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

function extractResearchNotes(text: string): ResearchNotes | null {
  const block = extractJsonBlock(text, "RESEARCH_NOTES");
  if (!block) {
    return null;
  }
  try {
    const parsed = JSON.parse(block);
    return researchNotesSchema.parse(parsed);
  } catch {
    return null;
  }
}

function mergeResearchNotes(userId: string, notes: ResearchNotes | null) {
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

async function refreshLongTermMemory(userId: string, force = false) {
  const state = getUserState(userId);
  if (state.longTermMemoryHydrated && !force) {
    return;
  }

  try {
    const memories = await memClient.getAll({ user_id: userId, limit: LONG_TERM_MEMORY_LIMIT });
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

    state.longTermMemories = parsed.slice(-LONG_TERM_MEMORY_LIMIT);
    state.longTermMemoryHydrated = true;
  } catch (error) {
    console.warn("Failed to sync long-term memory from Mem0:", error);
  }
}

function pushLongTermMemory(userId: string, text: string) {
  const value = text.trim();
  if (!value) {
    return;
  }
  const state = getUserState(userId);
  state.longTermMemories.push(value);
  trimList(state.longTermMemories, LONG_TERM_MEMORY_LIMIT);
  state.longTermMemoryHydrated = true;
}

async function writeLongTermMemory(userId: string, question: string, finalResponse: string) {
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

async function updateLongTermMemory(userId: string, fieldName: string, oldValue: string, newValue: string) {
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
    await refreshLongTermMemory(userId, true);
  } catch (error) {
    console.warn(`Failed to update long-term memory for ${fieldName}:`, error);
  }
}

async function getOrCreateConversationId(userId: string, force = false): Promise<string> {
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

async function ensureConversationSession(userId: string, force = false): Promise<void> {
  const state = getUserState(userId);
  if (!force && state.conversationSession) {
    return;
  }
  const conversationId = await getOrCreateConversationId(userId, force);
  state.conversationSession = new OpenAIConversationsSession({ conversationId, client: openai as any });
}

async function resetConversationSession(userId: string): Promise<void> {
  const state = getUserState(userId);
  clearConversationCache(userId);
  state.conversationSession = null;
  await ensureConversationSession(userId, true);
}

function isConversationMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const anyError = error as { status?: number; message?: string };
  const message = anyError.message?.toLowerCase() ?? "";
  const statusMatch = anyError.status === 404 || message.includes("not found");
  return statusMatch && message.includes("conversation");
}

async function getAgentStream(
  agent: Agent,
  input: string,
  label: AgentLabel,
  userId: string,
  attempt = 1
): Promise<AsyncIterable<any>> {
  await ensureConversationSession(userId, attempt > 1);
  const state = getUserState(userId);
  if (!state.conversationSession) {
    throw new Error("Conversation session is not initialized.");
  }
  try {
    return await run(agent, input, {
      stream: true,
      session: state.conversationSession
    });
  } catch (error) {
    if (attempt < 2 && isConversationMissingError(error)) {
      await resetConversationSession(userId);
      return getAgentStream(agent, input, label, userId, attempt + 1);
    }
    throw error;
  }
}

async function runSynthesizer(
  userId: string,
  question: string,
  routerPlan: RouterPlan,
  mentorOutputs: Partial<Record<AgentLabel, string>>
) {
  if (!synthesizerAgent) {
    return "";
  }

  const specialistSections = routerPlan.mentors
    .map((label) => `${mentorNames[label]}:\n${mentorOutputs[label as AgentLabel]?.trim() || "(no output)"}\n`)
    .join("\n");

  const synthInput = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(userId),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(userId),
    "",
    "Latest research sources:",
    formattedResearchSources(userId),
    "",
    "Router rationale:",
    routerPlan.reason,
    routerPlan.follow_up_question ? `Router follow-up question: ${routerPlan.follow_up_question}` : "",
    "",
    "Specialist outputs:",
    specialistSections,
    "",
    "Task: produce the unified YC mentor response as described in your instructions."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(synthesizerAgent, synthInput, "synth", userId);
  return fullText;
}

const researchKeywords = [
  "search",
  "lookup",
  "look up",
  "google",
  "blog",
  "article",
  "profile",
  "linkedin",
  "twitter",
  "github",
  "website",
  "web",
  "news",
  "press",
  "read"
];

function needsResearch(question: string): boolean {
  const text = question.toLowerCase();
  return researchKeywords.some((kw) => text.includes(kw));
}

async function runResearchAgent(userId: string, question: string): Promise<void> {
  if (!researchAgent) {
    return;
  }

  const prompt = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(userId),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(userId),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(userId),
    "",
    "Existing research sources:",
    formattedResearchSources(userId),
    "",
    "Task:",
    "- Use web search to gather fresh intel about the founder, their companies, or referenced articles/blog posts.",
    "- Summarize key facts and extract any idea leads that could inspire future projects.",
    "- Output the JSON block described in your instructions."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(researchAgent, prompt, "research", userId);
  const notes = extractResearchNotes(fullText);
  mergeResearchNotes(userId, notes);
}

// --- Dispatcher & Flows ---

async function runConsoleFlow(userId: string, question: string) {
  if (
    !businessGrowthMentor ||
    !fundraisingMentor ||
    !founderProfiler ||
    !routerAgent ||
    !synthesizerAgent ||
    !researchAgent
  ) {
    throw new Error("Agents are not initialized yet.");
  }

  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);
  if (needsResearch(question)) {
    await runResearchAgent(userId, question);
  }
  const routerPlan = await runRouterDecision(userId, question);
  await runFounderProfiler(userId, question);
  
  const mentorsToRun = Array.from(new Set(routerPlan.mentors)) as RouterAgentLabel[];
  const activeMentors = mentorsToRun.filter((m) => m !== "profile") as MentorLabel[];

  if (!quietMode) {
    const planDescription = mentorsToRun.join(" + ");
    console.log(routerInfoColor(`Router decision: ${planDescription}`));
    console.log(routerInfoColor(`Reason: ${routerPlan.reason}`));
    if (routerPlan.follow_up_question) {
      console.log(routerInfoColor(`Router follow-up: ${routerPlan.follow_up_question}`));
    }
  } else if (routerPlan.follow_up_question) {
    console.log(`${formatLabel("router")} ${colorThinking("router", routerPlan.follow_up_question)}`);
  }

  // If ONLY profile update was requested, we don't run any mentor agents.
  // The Synthesizer will see empty mentor outputs and just confirm the profile update.
  // If router failed to select any (empty list), fallback to 'biz'
  if (activeMentors.length === 0 && !mentorsToRun.includes("profile")) {
    activeMentors.push("biz");
  }

  let bizSummaryBlock = "";
  const mentorOutputs: Partial<Record<AgentLabel, string>> = {};

  for (const mentor of activeMentors) {
    if (mentor === "biz") {
      announceSection("biz", "YC Business & Growth Mentor");
      const bizInput = buildBusinessInput(userId, question);
      const { fullText } = await runAgentWithStreaming(businessGrowthMentor, bizInput, "biz", userId);
      mentorOutputs.biz = fullText;
      bizSummaryBlock = extractSummaryFromBiz(fullText);
    } else if (mentor === "fund") {
      announceSection("fund", "YC Fundraising & Market Strategy Mentor");
      const fundraisingInput = buildFundraisingInput(userId, question, bizSummaryBlock);
      const { fullText } = await runAgentWithStreaming(fundraisingMentor, fundraisingInput, "fund", userId);
      mentorOutputs.fund = fullText;
    } else if (mentor === "vehicle") {
      announceSection("vehicle", "US VC Fund & LP Expert");
      const vehicleInput = buildVehicleInput(userId, question, bizSummaryBlock);
      const { fullText } = await runAgentWithStreaming(vehicleMentor, vehicleInput, "vehicle", userId);
      mentorOutputs.vehicle = fullText;
    }
  }

  const finalResponse = await runSynthesizer(
    userId,
    question,
    { ...routerPlan, mentors: mentorsToRun as any }, // Cast to any to match the schema which expects MentorLabel[]
    mentorOutputs
  );
  await writeLongTermMemory(userId, question, finalResponse);
}

async function runProfileFlow(userId: string, question: string) {
  if (!founderProfiler) throw new Error("Agents not initialized");
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);
  
  // Check if user has existing profile/memories
  const state = getUserState(userId);
  const hasExistingMemory = state.longTermMemories.length > 0 || 
                            Object.keys(state.founderProfile).length > 0;
  
  // Profile flow is purely a conversation with the Founder Profiler
  await runFounderProfiler(userId, question, hasExistingMemory);
  
  // Note: runFounderProfiler streams internally via runAgentWithStreaming -> getAgentStream -> session
  // It parses the JSON but we also want the conversation to be natural.
  // The agent is prompted to output JSON but also "list clarifying questions".
  // The streaming output from runFounderProfiler IS the response the user sees.
}

function extractIdeationResults(text: string): IdeationResult | null {
  const block = extractJsonBlock(text, "IDEATION_RESULTS");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return ideationResultSchema.parse(parsed);
  } catch {
    return null;
  }
}

async function runIdeationFlow(userId: string, question: string) {
  if (!researchAgent || !ideationMentor) throw new Error("Agents not initialized");
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  // 1. Research Context
  // If question is short/generic, force a trend search
  const effectiveQuestion = question.length < 10 ? "What are the latest startup trends in my sector?" : question;
  await runResearchAgent(userId, effectiveQuestion);
  
  // 2. Ideation Mentor
  announceSection("ideation", "YC Ideation Partner");
  const ideationInput = buildBusinessInput(userId, question + "\n\nTask: Focus on idea generation. 1) Analyze market trends relevant to the founder's background. 2) Propose 4 unique, non-obvious startup ideas. 3) Allow the founder to critique them. 4) Keep response under 200 words.");
  
  const { fullText } = await runAgentWithStreaming(ideationMentor, ideationInput, "ideation", userId);
  
  // Store results
  const results = extractIdeationResults(fullText);
  if (results) {
    const state = getUserState(userId);
    state.ideationResults = results;
    // Also push to idea backlog
    if (results.top_ideas) {
      for (const idea of results.top_ideas) {
        if (!state.founderIdeaBacklog.includes(idea)) {
          state.founderIdeaBacklog.push(idea);
        }
      }
    }
    trimList(state.founderIdeaBacklog, IDEA_BACKLOG_LIMIT);
  }
}

function extractSprintPlan(text: string): SprintPlan | null {
  const block = extractJsonBlock(text, "SPRINT_PLAN");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return sprintPlanSchema.parse(parsed);
  } catch {
    return null;
  }
}

function extractVibeceleratorStatus(text: string): VibeceleratorStatus | null {
  const block = extractJsonBlock(text, "VIBECELERATOR_STATUS");
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return vibeceleratorStatusSchema.parse(parsed);
  } catch {
    return null;
  }
}

async function runSprintFlow(userId: string, question: string) {
  if (!sprintCoach) throw new Error("Agents not initialized");
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  announceSection("sprint", "YC Sprint Coach");
  const sprintInput = buildBusinessInput(userId, question + "\n\nTask: Provide a 90-minute execution plan. Be extremely tactical. Focus on 'Do things that don't scale'.");
  const { fullText } = await runAgentWithStreaming(sprintCoach, sprintInput, "sprint", userId);

  const plan = extractSprintPlan(fullText);
  if (plan) {
    const state = getUserState(userId);
    state.sprintPlan = plan;
  }
}

async function runVibeceleratorFlow(userId: string, question: string) {
  if (!vibeceleratorCoach) throw new Error("Agents not initialized");
  await ensureConversationSession(userId);
  await refreshLongTermMemory(userId);

  announceSection("vibecelerator", "9-Day Vibecelerator Coach");
  const input = buildBusinessInput(userId, question + "\n\nTask: Guide the founder through the 9-Day Vibecelerator program. High energy, heavy on 'vibe' and momentum.");
  const { fullText } = await runAgentWithStreaming(vibeceleratorCoach, input, "vibecelerator", userId);

  const status = extractVibeceleratorStatus(fullText);
  if (status) {
    const state = getUserState(userId);
    state.vibeceleratorStatus = status;
  }
}

export async function handleStepRequest(stepId: string, question: string, userId: string) {
  switch (stepId) {
    case "flow_profile":
      await runProfileFlow(userId, question);
      break;
    case "flow_ideation":
      await runIdeationFlow(userId, question);
      break;
    case "flow_sprint":
      await runSprintFlow(userId, question);
      break;
    case "flow_vibecelerator":
      await runVibeceleratorFlow(userId, question);
      break;
    case "flow_console":
    default:
      await runConsoleFlow(userId, question);
      break;
  }
}

export async function initializeWorkflow(): Promise<void> {
  await initializeMentors();
}

export function processSlashCommand(line: string): boolean {
  return handleSlashCommand(line);
}

export async function resetUserData(userId: string): Promise<void> {
  try {
    // 1. Clear conversation cache
    const userConversationPath = getConversationPath(userId);
    if (fs.existsSync(userConversationPath)) {
      fs.unlinkSync(userConversationPath);
    }

    // 2. Clear Mem0 long-term memory
    // Mem0 doesn't have a "deleteAll" by user, but we can list and delete.
    // For now, we'll just reset the local state which forces a refresh.
    
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
      // Note: we don't delete the key entirely so the object reference remains valid if held elsewhere,
      // but resetting properties is cleaner.
    }

    console.log(`[Reset] Data cleared for user ${userId}`);
  } catch (error) {
    console.error(`[Reset] Failed to clear data for user ${userId}:`, error);
    throw error;
  }
}

export function isQuietMode(): boolean {
  return quietMode;
}
