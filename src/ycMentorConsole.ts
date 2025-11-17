
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

import { Agent, run, tool } from "@openai/agents";
import {
  setDefaultOpenAIKey,
  webSearchTool,
  fileSearchTool,
  OpenAIConversationsSession,
  startOpenAIConversationsSession
} from "@openai/agents-openai";
import MemoryClient from "mem0";
import OpenAI from "openai";
import { z } from "zod";

const WORKFLOW_NAME = "yc_mentor_workflow";
const cwd = process.cwd();
const mentorGuidePath = path.resolve(cwd, "docs", "yc_mentor_guide.md");
const vectorStoreCacheDir = path.resolve(cwd, ".cache");
const vectorStoreCachePath = path.resolve(vectorStoreCacheDir, "yc_vector_store.json");
const conversationCachePath = path.resolve(vectorStoreCacheDir, `conversation_${process.env.USER_ID ?? "default_user"}.json`);

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
  mentors: z.array(z.enum(["biz", "fund"])).min(1),
  reason: z.string().min(1),
  follow_up_question: z.string().optional()
});

const researchNotesSchema = z.object({
  profile_insights: z.array(z.string()).optional(),
  idea_leads: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional()
});

type MentorLabel = "biz" | "fund";
type AgentLabel = MentorLabel | "profile" | "router" | "synth" | "research";
type FounderProfile = z.infer<typeof founderProfileSchema>;
type RouterPlan = z.infer<typeof routerPlanSchema>;
type ResearchNotes = z.infer<typeof researchNotesSchema>;

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

function loadConversationIdFromCache(): string | null {
  try {
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

function saveConversationIdToCache(conversationId: string) {
  try {
    ensureCacheDir();
    fs.writeFileSync(conversationCachePath, JSON.stringify({ conversationId }, null, 2), "utf8");
  } catch (error) {
    console.warn("Failed to persist conversation cache:", error);
  }
}

function clearConversationCache() {
  try {
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
  console.log("\nSlash commands:");
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

function slashCompleter(line: string): [string[], string] {
  if (!line.startsWith("/")) {
    return [[], line];
  }

  const hits = SLASH_COMMANDS.filter((cmd) => cmd.startsWith(line));
  return [hits.length > 0 ? hits : SLASH_COMMANDS, line];
}

function announceSection(label: MentorLabel, title: string) {
  if (quietMode) {
    return;
  }
  console.log(heading(label, `\n=== ${title} ===\n`));
}

const apiKey = process.env.OPENAI_API_KEY;
const mentorFileId = process.env.YC_MENTOR_FILE_ID;
const mem0ApiKey = process.env.MEM0_API_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;
const userId = process.env.USER_ID ?? "demo_user";

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

let businessGrowthMentor: Agent;
let fundraisingMentor: Agent;
let founderProfiler: Agent;
let routerAgent: Agent;
let synthesizerAgent: Agent;
let researchAgent: Agent;
let founderProfile: FounderProfile = {};
let founderIdeaBacklog: string[] = [];
let researchSourceLog: string[] = [];
let longTermMemories: string[] = [];
let longTermMemoryHydrated = false;
let conversationSession: OpenAIConversationsSession | null = null;

const LONG_TERM_MEMORY_LIMIT = 50;
const IDEA_BACKLOG_LIMIT = 20;
const RESEARCH_SOURCE_LIMIT = 20;

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

function mergeFounderProfile(update: FounderProfile | null) {
  if (!update) {
    return;
  }

  founderProfile = {
    ...founderProfile,
    ...Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    )
  };
}

function founderProfileSnapshot(): string {
  return Object.keys(founderProfile).length > 0 ? JSON.stringify(founderProfile, null, 2) : "(no founder profile yet)";
}

function trimList(list: string[], limit: number) {
  if (list.length > limit) {
    list.splice(0, list.length - limit);
  }
}

function longTermMemorySnapshot(limit = 10): string {
  if (!longTermMemories.length) {
    return "(no long-term memories yet)";
  }
  const recent = longTermMemories.slice(-limit);
  return recent.map((memory, index) => `${index + 1}. ${memory}`).join("\n");
}

function formattedIdeaBacklog(): string {
  if (!founderIdeaBacklog.length) {
    return "(no idea backlog entries)";
  }
  return founderIdeaBacklog.map((idea, index) => `${index + 1}. ${idea}`).join("\n");
}

function formattedResearchSources(): string {
  if (!researchSourceLog.length) {
    return "(no research sources yet)";
  }
  return researchSourceLog.map((source, index) => `${index + 1}. ${source}`).join("\n");
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
  ]
};

const mentorNames: Record<MentorLabel, string> = {
  biz: "YC Business & Growth Mentor",
  fund: "YC Fundraising & Market Strategy Mentor"
};

function routeMentors(question: string): MentorLabel[] {
  const text = question.toLowerCase();
  const matches = (keywords: string[]) => keywords.some((kw) => text.includes(kw));

  let wantsBiz = matches(ROUTER_KEYWORDS.biz);
  let wantsFund = matches(ROUTER_KEYWORDS.fund);

  const profileText = founderProfileSnapshot().toLowerCase();
  if (!wantsFund && /raise|fund|investor|runway|seed|fundraising/.test(profileText)) {
    wantsFund = true;
  }
  if (!wantsBiz && /mvp|users|product|growth|distribution/.test(profileText)) {
    wantsBiz = true;
  }

  if (!wantsBiz && !wantsFund) {
    wantsBiz = true;
  }

  if (text.includes("both mentors") || text.includes("all mentors")) {
    wantsBiz = true;
    wantsFund = true;
  }

  const plan: MentorLabel[] = [];
  if (wantsBiz) {
    plan.push("biz");
  }
  if (wantsFund) {
    plan.push("fund");
  }

  return plan;
}

function buildBusinessInput(question: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Recent research sources:",
    formattedResearchSources()
  ].join("\n");
}

function buildFundraisingInput(question: string, bizSummary: string): string {
  return [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Recent research sources:",
    formattedResearchSources(),
    "",
    "Summary from Business & Growth Mentor (stage, traction, bottleneck, focus):",
    bizSummary || "(business mentor not run yet; infer from founder question and profile)"
  ].join("\n");
}

async function initializeMentors() {
  console.log("Preparing YC mentor agents (web + file search)...");
  const vectorStoreId = await resolveVectorStoreId();
  const web = webSearchTool();
  const filesTool = fileSearchTool(vectorStoreId);
  const tavilyTool = tavilySearchTool;

  businessGrowthMentor = new Agent({
    name: "YC Business & Growth Mentor",
    model: "gpt-5.1",
    tools: [web, filesTool, tavilyTool],
    instructions: [
      "You are a YC partner-level Business & Growth Mentor focused on stage diagnosis, talking to users, MVP focus, growth hacking, and cofounder alignment.",
      `You have an internal mentor guide that defines tone and structure. Summary: ${mentorGuideSummary}`,
      "Use File Search (the uploaded guide) when referencing YC principles. Use Web Search whenever outside validation or fresh YC content can help.",
      "You also have a Tavily search tool for broad web lookups (LinkedIn, Medium, blog posts, interviews). Prefer it when the founder explicitly asks you to research online footprints.",
      "When you search the web, bias queries toward YC domains using filters like site:ycombinator.com, site:startupschool.org, site:startups.ycombinator.com, site:blog.ycombinator.com, and site:paulgraham.com.",
      "Reference YC Startup School resources (https://www.startupschool.org) whenever they reinforce your advice—mention the specific talk or module (e.g., Michael Seibel’s “How to Plan your MVP”).",
      "Follow this fixed output format: 1) Diagnosis (1–2 sentences) 2) 3–5 concrete action bullets 3) Homework (1 line) 4) Clarifying question (1 line).",
      "End every answer with a fenced JSON block exactly like:\n```json SUMMARY\n{ \"stage\": \"...\", \"traction\": \"...\", \"main_bottleneck\": \"...\", \"focus\": \"...\" }\n```"
    ].join("\n")
  });

  fundraisingMentor = new Agent({
    name: "YC Fundraising & Market Strategy Mentor",
    model: "gpt-5.1",
    tools: [web, filesTool, tavilyTool],
    instructions: [
      "You are a YC partner-level Fundraising & Market Strategy Mentor.",
      `You have the founder's original question plus a short structured summary from the Business & Growth Mentor (stage, traction, bottleneck, focus).`,
      `You also have the internal mentor guide summary: ${mentorGuideSummary}`,
      "Use File Search (uploaded guide) for tone/structure grounding. Use Tavily + Web Search when external references (investor news, competitive fundraises, profile checks) will strengthen your answer.",
      "When you propose milestones or investor narratives, cite YC Startup School content (https://www.startupschool.org) or YC partner talks that support the recommendation.",
      "Focus on: whether to raise now, how much or whether to wait, the milestones and metrics that unlock fundraising, and market size + narrative clarity.",
      "Output format: 1) Fundraising & Market Diagnosis (1–2 sentences) 2) 3–5 concrete action bullets 3) Homework (1 line) 4) Clarifying question (1 line)."
    ].join("\n")
  });

  founderProfiler = new Agent({
    name: "YC Founder Profiler",
    model: "gpt-5.1",
    tools: [filesTool],
    instructions: [
      "You are a YC-style Founder Profiler. Build a living profile of the founder: motivations, experience, risk appetite, clarity of thought, execution bias, fundraising intent, and working style.",
      `You have the internal mentor guide: ${mentorGuideSummary}`,
      "Use File Search when referencing YC tone or guidance. Mention Startup School resources (https://www.startupschool.org) if they reinforce your suggestions.",
      "Each response must include: (1) 2–3 sentence narrative update about the founder. (2) 3 concise bullet points for notable traits, strengths, or gaps. (3) Homework or reflection for the founder (1 line). (4) Clarifying question (1 line).",
      "End every response with a fenced JSON block:\n```json FOUNDER_PROFILE\n{ \"founder\": \"...\", \"background\": \"...\", \"stage\": \"...\", \"motivations\": \"...\", \"strengths\": \"...\", \"gaps\": \"...\", \"working_style\": \"...\", \"goals\": \"...\", \"notes\": \"...\" }\n```",
      "Always incorporate previous profile information provided in the prompt and update only what changed."
    ].join("\n")
  });

  routerAgent = new Agent({
    name: "YC Router",
    model: "gpt-5.1",
    tools: [filesTool],
    instructions: [
      "You are the YC Router. Your job is to read the founder's latest question plus the running founder profile and decide which specialist mentors (Business & Growth, Fundraising & Market) should answer.",
      `You also have the YC mentor guide summary: ${mentorGuideSummary}`,
      "Steps:",
      "1. Start with a one-sentence 'Router check' line to the founder that confirms your understanding or surfaces a clarification point.",
      "2. Output a JSON block EXACTLY in this format:\n```json ROUTER_PLAN\n{ \"mentors\": [\"biz\", \"fund\"], \"reason\": \"...\", \"follow_up_question\": \"optional\" }\n```",
      "Always include at least one mentor. Prefer the specialist that best addresses the question; include both when needed.",
      "Use YC tone: concise, confident, focused on action.",
      "If useful, reference Startup School resources but keep the router check to one sentence."
    ].join("\n")
  });

  synthesizerAgent = new Agent({
    name: "YC Mentor Synthesizer",
    model: "gpt-5.1",
    tools: [filesTool],
    instructions: [
      "You are the final YC mentor voice. You see the founder's question, founder profile, router rationale, and raw outputs from the specialists (Business & Growth, Fundraising).",
      `You have the mentor guide summary: ${mentorGuideSummary}`,
      "Task: craft a single, human YC partner style response that weaves together the best ideas from the specialists without mentioning them explicitly.",
      "Output format:",
      "1) Diagnosis (1–2 sentences)",
      "2) 3 concrete action bullets (can mix execution + fundraising depending on available data)",
      "3) Homework (1 line)",
      "4) Clarifying question (1 line)",
      "Speak naturally, refer to YC / Startup School insights when relevant (e.g., “as YC’s Startup School reminds…”).",
      "Do NOT expose internal agent names or JSON summaries; speak as one mentor."
    ].join("\n")
  });

  researchAgent = new Agent({
    name: "YC Research Scout",
    model: "gpt-5.1",
    tools: [tavilyTool, web, filesTool],
    instructions: [
      "You are the YC Research Scout. You combine YC mentor tone with investigative skills.",
      `Tone + structure defined by this guide: ${mentorGuideSummary}`,
      "Whenever asked to \"look up\", \"search\", or reference external profiles/blog posts, you must:",
      "1. Use the Tavily search tool with relevant keywords (e.g., founder's name, LinkedIn, company, blog topic).",
      "2. Summarize the most relevant facts (roles, achievements, recent posts).",
      "3. Capture any startup idea leads inspired by the findings.",
      "4. Provide source URLs so we can cite them later.",
      "Output format:",
      "- A short natural-language paragraph summarizing key findings.",
      "- A bullet list of 1–3 idea leads if applicable.",
      "- Finish with:\n```json RESEARCH_NOTES\n{ \"profile_insights\": [\"...\"], \"idea_leads\": [\"...\"], \"sources\": [\"url1\", \"url2\"] }\n```",
      "If nothing useful is found, explicitly say so but still emit the JSON block with empty arrays."
    ].join("\n")
  });

  console.log("Mentors ready.");
}

async function resolveVectorStoreId(): Promise<string> {
  const existingVectorStoreId = process.env.YC_MENTOR_VECTOR_STORE_ID?.trim();
  if (existingVectorStoreId) {
    return existingVectorStoreId;
  }

  const cachedId = loadCachedVectorStoreId();
  if (cachedId) {
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

  return vectorStore.id;
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

async function runAgentWithStreaming(agent: Agent, input: string, label: AgentLabel): Promise<{ fullText: string }> {
  const verbose = !quietMode;
  const streamAnswers = !quietMode;
  const spinner = startSpinner(label, "thinking...");

  const stream = await getAgentStream(agent, input, label);
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

async function runFounderProfiler(question: string) {
  if (!founderProfiler) {
    return;
  }

  if (!quietMode) {
    console.log(heading("profile", "\n=== YC Founder Profiler ===\n"));
  }
  const profilerInput = [
    "Founder question:",
    question,
    "",
    "Existing founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Recent research sources:",
    formattedResearchSources(),
    "",
    "Task: Update the profile with any new signals, highlight risks/opportunities, list clarifying questions, and output the JSON block as specified."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(founderProfiler, profilerInput, "profile");
  const profileUpdate = extractFounderProfile(fullText);
  mergeFounderProfile(profileUpdate);
}

function fallbackRouterPlan(question: string): RouterPlan {
  const mentors = routeMentors(question);
  return {
    mentors: mentors.length > 0 ? mentors : ["biz"],
    reason: "Heuristic fallback based on question keywords."
  };
}

async function runRouterDecision(question: string): Promise<RouterPlan> {
  if (!routerAgent) {
    return fallbackRouterPlan(question);
  }

  const routerInput = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Recent research sources:",
    formattedResearchSources(),
    "",
    "Task:",
    "- Provide a one-sentence line starting with 'Router check:' that confirms or reframes the user's ask.",
    "- Then output the JSON block described in your instructions."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(routerAgent, routerInput, "router");
  const checkLine = extractRouterCheck(fullText);
  if (checkLine) {
    console.log(`${formatLabel("router")} ${colorThinking("router", checkLine)}`);
  }

  const plan = extractRouterPlan(fullText);
  if (plan && plan.mentors.length > 0) {
    return plan;
  }
  return fallbackRouterPlan(question);
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

function mergeResearchNotes(notes: ResearchNotes | null) {
  if (!notes) {
    return;
  }

  const newInsights = notes.profile_insights ?? [];
  if (newInsights.length > 0) {
    const existing = founderProfile.notes ? `${founderProfile.notes}\n` : "";
    founderProfile.notes = `${existing}${newInsights.join("\n")}`.trim();
  }

  if (notes.idea_leads) {
    for (const idea of notes.idea_leads) {
      if (idea && !founderIdeaBacklog.includes(idea)) {
        founderIdeaBacklog.push(idea);
      }
    }
    trimList(founderIdeaBacklog, IDEA_BACKLOG_LIMIT);
  }

  if (notes.sources) {
    for (const source of notes.sources) {
      if (source && !researchSourceLog.includes(source)) {
        researchSourceLog.push(source);
      }
    }
    trimList(researchSourceLog, RESEARCH_SOURCE_LIMIT);
  }
}

async function refreshLongTermMemory(force = false) {
  if (longTermMemoryHydrated && !force) {
    return;
  }

  try {
    const memories = await memClient.getAll({ user_id: userId, limit: LONG_TERM_MEMORY_LIMIT });
    const parsed = memories
      .map((memory) => {
        const candidate =
          (typeof memory.memory === "string" && memory.memory) ||
          (typeof memory.data?.memory === "string" && memory.data.memory) ||
          (typeof memory.data === "string" && memory.data) ||
          "";
        return candidate?.toString().trim();
      })
      .filter((text): text is string => Boolean(text));

    longTermMemories = parsed.slice(-LONG_TERM_MEMORY_LIMIT);
    longTermMemoryHydrated = true;
  } catch (error) {
    console.warn("Failed to sync long-term memory from Mem0:", error);
  }
}

function pushLongTermMemory(text: string) {
  const value = text.trim();
  if (!value) {
    return;
  }
  longTermMemories.push(value);
  trimList(longTermMemories, LONG_TERM_MEMORY_LIMIT);
  longTermMemoryHydrated = true;
}

async function writeLongTermMemory(question: string, finalResponse: string) {
  const summary = finalResponse.trim();
  if (!summary) {
    return;
  }

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
          idea_backlog: founderIdeaBacklog.slice(-5),
          sources: researchSourceLog.slice(-5)
        }
      }
    );
    pushLongTermMemory(summary);
  } catch (error) {
    console.warn("Failed to persist long-term memory to Mem0:", error);
  }
}

async function getOrCreateConversationId(force = false): Promise<string> {
  if (!force) {
    const cached = loadConversationIdFromCache();
    if (cached) {
      return cached;
    }
  }

  const newId = await startOpenAIConversationsSession(openai);
  saveConversationIdToCache(newId);
  return newId;
}

async function ensureConversationSession(force = false): Promise<void> {
  if (!force && conversationSession) {
    return;
  }
  const conversationId = await getOrCreateConversationId(force);
  conversationSession = new OpenAIConversationsSession({ conversationId, client: openai });
}

async function resetConversationSession(): Promise<void> {
  clearConversationCache();
  conversationSession = null;
  await ensureConversationSession(true);
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
  attempt = 1
): Promise<AsyncIterable<any>> {
  await ensureConversationSession(attempt > 1);
  if (!conversationSession) {
    throw new Error("Conversation session is not initialized.");
  }
  try {
    return await run(agent, input, {
      stream: true,
      workflowName: WORKFLOW_NAME,
      session: conversationSession
    });
  } catch (error) {
    if (attempt < 2 && isConversationMissingError(error)) {
      await resetConversationSession();
      return getAgentStream(agent, input, label, attempt + 1);
    }
    throw error;
  }
}

async function runSynthesizer(
  question: string,
  routerPlan: RouterPlan,
  mentorOutputs: Partial<Record<MentorLabel, string>>
) {
  if (!synthesizerAgent) {
    return "";
  }

  const specialistSections = routerPlan.mentors
    .map((label) => `${mentorNames[label]}:\n${mentorOutputs[label]?.trim() || "(no output)"}\n`)
    .join("\n");

  const synthInput = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Latest research sources:",
    formattedResearchSources(),
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

  const { fullText } = await runAgentWithStreaming(synthesizerAgent, synthInput, "synth");
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

async function runResearchAgent(question: string): Promise<void> {
  if (!researchAgent) {
    return;
  }

  const prompt = [
    "Founder question:",
    question,
    "",
    "Founder profile snapshot (JSON):",
    founderProfileSnapshot(),
    "",
    "Long-term memory snapshot:",
    longTermMemorySnapshot(),
    "",
    "Founder idea backlog:",
    formattedIdeaBacklog(),
    "",
    "Existing research sources:",
    formattedResearchSources(),
    "",
    "Task:",
    "- Use web search to gather fresh intel about the founder, their companies, or referenced articles/blog posts.",
    "- Summarize key facts and extract any idea leads that could inspire future projects.",
    "- Output the JSON block described in your instructions."
  ].join("\n");

  const { fullText } = await runAgentWithStreaming(researchAgent, prompt, "research");
  const notes = extractResearchNotes(fullText);
  mergeResearchNotes(notes);
}

async function runWorkflow(question: string) {
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

  await ensureConversationSession();
  await refreshLongTermMemory();
  if (needsResearch(question)) {
    await runResearchAgent(question);
  }
  await runFounderProfiler(question);

  const routerPlan = await runRouterDecision(question);
  const mentorsToRun = Array.from(new Set(routerPlan.mentors)) as MentorLabel[];
  if (mentorsToRun.length === 0) {
    mentorsToRun.push("biz");
  }

  if (!quietMode) {
    const planDescription = mentorsToRun.map((label) => mentorNames[label]).join(" → ");
    console.log(routerInfoColor(`Router decision: ${planDescription}`));
    console.log(routerInfoColor(`Reason: ${routerPlan.reason}`));
    if (routerPlan.follow_up_question) {
      console.log(routerInfoColor(`Router follow-up: ${routerPlan.follow_up_question}`));
    }
  } else if (routerPlan.follow_up_question) {
    console.log(`${formatLabel("router")} ${colorThinking("router", routerPlan.follow_up_question)}`);
  }

  let bizSummaryBlock = "";
  const mentorOutputs: Partial<Record<MentorLabel, string>> = {};

  for (const mentor of mentorsToRun) {
    if (mentor === "biz") {
      announceSection("biz", "YC Business & Growth Mentor");
      const bizInput = buildBusinessInput(question);
      const { fullText } = await runAgentWithStreaming(businessGrowthMentor, bizInput, "biz");
      mentorOutputs.biz = fullText;
      bizSummaryBlock = extractSummaryFromBiz(fullText);
    } else if (mentor === "fund") {
      announceSection("fund", "YC Fundraising & Market Strategy Mentor");
      const fundraisingInput = buildFundraisingInput(question, bizSummaryBlock);
      const { fullText } = await runAgentWithStreaming(fundraisingMentor, fundraisingInput, "fund");
      mentorOutputs.fund = fullText;
    }
  }

  const finalResponse = await runSynthesizer(
    question,
    { ...routerPlan, mentors: mentorsToRun },
    mentorOutputs
  );
  await writeLongTermMemory(question, finalResponse);
}

async function main() {
  console.log("YC Mentor Workflow – ask your startup question (Ctrl+C to exit)");
  await initializeMentors();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: slashCompleter,
    prompt: "Founder: "
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const question = line.trim();
    if (!question) {
      console.log("Please enter a question or press Ctrl+C to exit.");
      rl.prompt();
      return;
    }

    if (question.startsWith("/")) {
      handleSlashCommand(question);
      rl.prompt();
      return;
    }

    try {
      await runWorkflow(question);
    } catch (error) {
      console.error("Workflow run failed:", error);
    } finally {
      rl.prompt();
    }
  });

  rl.on("close", () => {
    console.log("Exiting YC Mentor Workflow.");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

