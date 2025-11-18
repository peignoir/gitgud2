import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import QRCode from "react-qr-code";

const COMMANDS = ["/help", "/quiet"];

type FlowAgent = "profile" | "router" | "biz" | "fund" | "vehicle" | "synth" | "research";
type PromptKey = FlowAgent;

type FlowStep = {
  id: FlowAgent;
  title: string;
  summary: string;
  optional?: boolean;
  kind: "agent" | "tool";
};

type AgentFlowState = Record<FlowAgent, { status: "pending" | "running" | "done"; output: string }>;

const FLOW_STEPS: Record<FlowAgent, FlowStep> = {
  router: {
    id: "router",
    title: "Router",
    summary: "Decides which specialist mentors should answer.",
    kind: "agent"
  },
  profile: {
    id: "profile",
    title: "Founder Profiler",
    summary: "Builds a living profile of you as a founder.",
    kind: "agent"
  },
  biz: {
    id: "biz",
    title: "Business & Growth Mentor",
    summary: "Diagnoses product, users, and GTM focus.",
    kind: "agent"
  },
  fund: {
    id: "fund",
    title: "Fundraising & Market Mentor",
    summary: "Shapes the fundraising narrative and milestones.",
    kind: "agent"
  },
  vehicle: {
    id: "vehicle",
    title: "US VC Fund & LP Expert",
    summary: "Designs vehicles and LP strategies for emerging managers.",
    kind: "agent"
  },
  synth: {
    id: "synth",
    title: "Mentor Synthesizer",
    summary: "Combines every perspective into one YC-style answer.",
    kind: "agent"
  },
  research: {
    id: "research",
    title: "Research Scout",
    summary: "Runs web lookups for external proof points.",
    optional: true,
    kind: "tool"
  }
};

const TOOL_SEQUENCE: FlowAgent[] = ["research"];
const AGENT_SEQUENCE: FlowAgent[] = ["router", "profile", "biz", "fund", "vehicle", "synth"];
const FLOW_SEQUENCE: FlowAgent[] = [...AGENT_SEQUENCE, ...TOOL_SEQUENCE];

const LABEL_MAP: Record<string, FlowAgent> = {
  profile: "profile",
  router: "router",
  biz: "biz",
  fund: "fund",
  vehicle: "vehicle",
  mentor: "synth",
  synth: "synth",
  research: "research"
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-white/60",
    dot: "bg-white/40",
    ring: "border-white/30",
    fill: "bg-white/5",
    connector: "bg-white/20"
  },
  running: {
    label: "Running",
    color: "text-amber-300",
    dot: "bg-amber-400 animate-pulse",
    ring: "border-amber-300 shadow-[0_0_20px_rgba(255,214,153,0.35)]",
    fill: "bg-amber-300/10",
    connector: "bg-amber-300/60"
  },
  done: {
    label: "Done",
    color: "text-emerald-300",
    dot: "bg-emerald-400",
    ring: "border-emerald-300 shadow-[0_0_16px_rgba(72,187,120,0.4)]",
    fill: "bg-emerald-400/10",
    connector: "bg-emerald-400/60"
  }
} as const;

const DEFAULT_STATUS_META = {
  label: "Ready",
  color: "text-white/60",
  dot: "bg-white/30",
  ring: "border-white/20",
  fill: "bg-white/5",
  connector: "bg-white/20"
} as const;

const PROMPT_METADATA: { id: PromptKey; label: string; description: string }[] = [
  { id: "router", label: "Router", description: "Decides who should speak" },
  { id: "biz", label: "Business & Growth", description: "Diagnoses product & GTM" },
  { id: "fund", label: "Fundraising & Market", description: "Shapes narrative for investors" },
  { id: "vehicle", label: "VC Fund & LP Expert", description: "Designs vehicles & LP strategy" },
  { id: "synth", label: "Mentor Synthesizer", description: "Combines every insight" },
  { id: "profile", label: "Founder Profiler", description: "Captures founder signals" },
  { id: "research", label: "Research Scout", description: "Web + source discovery" }
];

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

const createInitialFlowState = (): AgentFlowState =>
  FLOW_SEQUENCE.reduce((acc, stepId) => {
    acc[stepId] = { status: "pending", output: "" };
    return acc;
  }, {} as AgentFlowState);

type FlowCardKind = "context" | "tool" | "agent" | "output";

const KIND_LABELS: Record<FlowCardKind, string> = {
  context: "Context",
  tool: "Tool",
  agent: "Mentor",
  output: "Output"
};

type FlowNodeCardProps = {
  title: string;
  subtitle: string;
  kind: FlowCardKind;
  status?: keyof typeof STATUS_CONFIG;
  active?: boolean;
  onClick?: () => void;
};

const FlowNodeCard = ({ title, subtitle, kind, status, active, onClick }: FlowNodeCardProps) => {
  const meta = status ? STATUS_CONFIG[status] : DEFAULT_STATUS_META;
  return (
    <div
      className={`rounded-2xl border ${active ? "border-[#f5d580] shadow-lg" : "border-white/15"} bg-[#111522] p-4 transition ${
        onClick ? "cursor-pointer hover:border-[#f5d580]/60" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/45">{KIND_LABELS[kind]}</p>
          <h4 className="text-white font-semibold">{title}</h4>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>
          {status ? meta.label : DEFAULT_STATUS_META.label}
        </span>
      </div>
      <p className="text-xs text-white/65 mt-2 leading-relaxed">{subtitle}</p>
    </div>
  );
};

type StreamEvent = {
  chunk?: string;
  message?: string;
};

export default function App() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentAgentRef = useRef<FlowAgent | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [commandSheetOpen, setCommandSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"console" | "flow">("console");
  const [agentFlowState, setAgentFlowState] = useState<AgentFlowState>(() => createInitialFlowState());
  const [selectedAgent, setSelectedAgent] = useState<FlowAgent>("router");
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [prompts, setPrompts] = useState<Partial<Record<PromptKey, string>>>({});
  const [activePromptId, setActivePromptId] = useState<PromptKey>("router");
  const [promptDraft, setPromptDraft] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [pdfSummaries, setPdfSummaries] = useState<{ id: string; summary: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const mobileAppUrl = import.meta.env.VITE_MOBILE_APP_URL ?? "https://gitgud-mobile.vercel.app";
  const eventSourceRef = useRef<EventSource | null>(null);

  const resetFlowState = () => {
    setAgentFlowState(createInitialFlowState());
    currentAgentRef.current = null;
    setSelectedAgent("router");
  };

  const handleFlowChunk = (chunk: string) => {
    const cleaned = stripAnsi(chunk);
    const labelMatch = cleaned.match(/\[(profile|router|biz|fund|mentor|research)\]/i);

    if (labelMatch) {
      const normalized = LABEL_MAP[labelMatch[1].toLowerCase()] ?? null;
      if (normalized) {
        const previous = currentAgentRef.current;
        if (previous && previous !== normalized) {
          setAgentFlowState((prev) => ({
            ...prev,
            [previous]: {
              ...prev[previous],
              status: prev[previous].output ? "done" : prev[previous].status
            }
          }));
        }
        currentAgentRef.current = normalized;
      }
    }

    const activeLabel = currentAgentRef.current;
    if (!activeLabel) {
      return;
    }

    setAgentFlowState((prev) => {
      const labelState = prev[activeLabel];
      return {
        ...prev,
        [activeLabel]: {
          status: labelState.status === "pending" ? "running" : labelState.status,
          output: labelState.output + cleaned
        }
      };
    });
  };

  const finalizeFlow = () => {
    setAgentFlowState((prev) => {
      const next: AgentFlowState = { ...prev };
      FLOW_SEQUENCE.forEach((stepId) => {
        const state = next[stepId];
        if (!state) {
          return;
        }
        if (state.status === "running" || (state.output && state.status === "pending")) {
          next[stepId] = { ...state, status: "done" };
        }
      });
      return next;
    });
    currentAgentRef.current = null;
  };

  const selectedStep = FLOW_STEPS[selectedAgent] ?? FLOW_STEPS.router;
  const selectedState = agentFlowState[selectedStep.id];
  const selectedStatusConfig = STATUS_CONFIG[selectedState?.status ?? "pending"];
  const selectedOutput =
    selectedState?.output.trim() ||
    (selectedState?.status === "pending" ? "Awaiting this agent..." : "No output captured yet.");

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    const term = new Terminal({
      allowTransparency: true,
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: '"SFMono-Regular", Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: "#282d37",
        foreground: "#fefefe",
        cursor: "#fefefe",
        black: "#000000",
        red: "#ff6b6b",
        green: "#32d296",
        yellow: "#ffd479",
        blue: "#64b5f6",
        magenta: "#f06292",
        cyan: "#4dd0e1",
        white: "#ffffff",
        brightBlack: "#8e8e8e"
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    const applyResponsiveSizing = () => {
      if (!terminalRef.current) {
        return;
      }
      const width = window.innerWidth;
      const fontSize = width < 420 ? 11 : width < 640 ? 12 : width < 960 ? 13 : 14;
      term.options.fontSize = fontSize;
      requestAnimationFrame(() => fitAddon.fit());
    };

    term.open(terminalRef.current);
    terminal.current = term;
    applyResponsiveSizing();
    term.writeln("\x1b[1;33mYC Mentor Workflow web console ready.\x1b[0m");
    term.writeln("Type your question below or use /help for commands.");
    term.writeln("");

    window.addEventListener("resize", applyResponsiveSizing);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(applyResponsiveSizing);
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener("resize", applyResponsiveSizing);
      resizeObserver?.disconnect();
      fitAddonRef.current = null;
      terminal.current?.dispose();
      terminal.current = null;
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!promptModalOpen) {
      return;
    }
    setPromptLoading(true);
    setPromptError(null);
    fetch("/api/prompts")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load prompts");
        }
        return res.json();
      })
      .then((data: Record<string, string>) => {
        setPrompts(data);
        setPromptDraft(data[activePromptId] ?? "");
      })
      .catch(() => {
        setPromptError("Unable to load prompts.");
      })
      .finally(() => {
        setPromptLoading(false);
      });
  }, [promptModalOpen]);

  useEffect(() => {
    if (!promptModalOpen) {
      return;
    }
    setPromptDraft(prompts[activePromptId] ?? "");
  }, [activePromptId, promptModalOpen, prompts]);

  useEffect(() => {
    if (activeTab !== "console") {
      return;
    }
    if (!fitAddonRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      try {
        fitAddonRef.current?.fit();
      } catch (error) {
        console.warn("[Terminal] fit failed after layout change", error);
      }
    });
  }, [activeTab, pdfStatus]);

  const appendChunk = (chunk: string) => {
    const term = terminal.current;
    if (!term) {
      return;
    }
    try {
      term.write(chunk);
      term.scrollToBottom();
    } catch (error) {
      console.warn("[Terminal] write/scroll failed", error);
    }
    handleFlowChunk(chunk);
  };

  const startStream = async (question: string) => {
    setIsSending(true);
    eventSourceRef.current?.close();
    const url = `/api/stream?question=${encodeURIComponent(question)}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    source.addEventListener("chunk", (event) => {
      const data: StreamEvent = JSON.parse((event as MessageEvent).data);
      if (data.chunk) {
        appendChunk(data.chunk);
      }
    });

    source.addEventListener("error", (event) => {
      const data: StreamEvent = JSON.parse((event as MessageEvent).data || "{}");
      appendChunk(`\n\x1b[1;31m${data.message ?? "Something went wrong."}\x1b[0m\n`);
      source.close();
      setIsSending(false);
      finalizeFlow();
    });

    source.addEventListener("done", () => {
      appendChunk("\n");
      source.close();
      setIsSending(false);
      finalizeFlow();
    });
  };

  const handleSubmit = async () => {
    const question = input.trim();
    if (!question || isSending) {
      return;
    }
    resetFlowState();
    setActiveTab("console");
    appendChunk(`\r\n\x1b[36mFounder:\x1b[0m ${question}\r\n`);
    setInput("");
    await startStream(question);
  };

  const handleCommandClick = (command: string) => {
    setCommandSheetOpen(false);
    setInput(command);
  };

  const handlePdfUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePdfSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    console.log("[PDF Upload] Selected file:", file.name, file.size);
    setIsUploadingPdf(true);
    setPdfStatus("Uploading and indexing PDF...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/files/pdf", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));
      console.log("[PDF Upload] Server response:", response.status, data);
      if (!response.ok) {
        throw new Error(data?.error || "Upload failed.");
      }
      if (data?.summary) {
        const entry = { id: `${Date.now()}`, summary: data.summary };
        setPdfSummaries((prev) => [entry, ...prev].slice(0, 5));
        setPdfStatus(data.summary);
        setToastMessage("PDF indexed and summarized.");
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setPdfStatus("PDF indexed and ready for future questions.");
      }
    } catch (error) {
      setPdfStatus(error instanceof Error ? error.message : "Failed to upload PDF.");
      console.error("[PDF Upload] Failed:", error);
    } finally {
      setIsUploadingPdf(false);
      event.target.value = "";
    }
  };

  const handlePromptSave = async () => {
    setPromptSaving(true);
    setPromptError(null);
    try {
      const response = await fetch(`/api/prompts/${activePromptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptDraft })
      });
      if (!response.ok) {
        throw new Error();
      }
      const data = (await response.json()) as { prompt: string };
      setPrompts((prev) => ({
        ...prev,
        [activePromptId]: data.prompt ?? promptDraft
      }));
    } catch {
      setPromptError("Failed to save prompt. Please try again.");
    } finally {
      setPromptSaving(false);
    }
  };

  const branchAgents: FlowAgent[] = ["profile", "biz", "fund", "vehicle"];
  const contextCards = [
    {
      id: "founder-input",
      title: "Founder Input",
      subtitle: "Live question + slash commands. Router distills this feed before branching."
    },
    {
      id: "short-memory",
      title: "Short-Term Memory",
      subtitle: "Per-run scratchpad + router plan shared with every mentor in this session."
    },
    {
      id: "long-memory",
      title: "Long-Term Memory",
      subtitle: "Mem0 insights from prior sessions so mentors remember the founder’s arc."
    },
    {
      id: "doc-base",
      title: "Document Base",
      subtitle: `Shared File Search corpus: YC guide + ${Math.max(pdfSummaries.length, 0)} uploaded PDFs + knowledge packs.`
    }
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-consoleBg text-consoleFg overflow-hidden">
      <header className="p-4 text-center text-lg font-semibold tracking-wide">
        Welcome to GitGud.vc
      </header>

      <main className="flex-1 min-h-0 px-3 pb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex gap-2 rounded-2xl bg-[#1f232b] p-1 w-fit">
            <button
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                activeTab === "console" ? "bg-[#ceb06d] text-black shadow" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("console")}
            >
              Console
            </button>
            <button
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                activeTab === "flow" ? "bg-[#ceb06d] text-black shadow" : "text-white/70 hover:text-white"
              }`}
              onClick={() => setActiveTab("flow")}
            >
              Agent Flow
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-3xl px-4 py-3">
            <div className="bg-white p-2 rounded-2xl">
              <QRCode value={mobileAppUrl} size={72} style={{ height: "72px", width: "72px" }} />
            </div>
            <div className="text-xs text-white/70 leading-relaxed max-w-[220px]">
              <p className="text-sm font-semibold text-white">Founder app</p>
              <p>Scan to open the mobile PWA. Share with GPs who want a native feel.</p>
              <a href={mobileAppUrl} target="_blank" rel="noreferrer" className="text-brand font-semibold underline">
                {mobileAppUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${activeTab === "console" ? "flex" : "hidden"}`}>
          <div className="terminal-wrapper flex-1 rounded-3xl bg-[#282d37] shadow-lg">
            {pdfStatus && (
              <div className="pointer-events-none absolute top-4 left-4 right-4 z-10">
                <div className="text-xs text-amber-200 bg-black/60 border border-white/10 rounded-2xl p-3 backdrop-blur-sm">
                  <strong className="block text-white/80 mb-1">Latest PDF Summary</strong>
                  <p className="whitespace-pre-line leading-relaxed text-white/90">{pdfStatus}</p>
                </div>
              </div>
            )}
            <div className="h-full w-full" ref={terminalRef} />
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${activeTab === "flow" ? "flex flex-col gap-4" : "hidden"}`}>
          <div className="bg-[#1f232b] rounded-3xl p-4 shadow-inner space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold">Agentic Flow</h2>
                <p className="text-sm text-white/60">Context feeds the router, which branches to mentors before synthesis.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-white/60">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-white/40" /> Pending
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Running
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Done
                </div>
                <button
                  onClick={() => setPromptModalOpen(true)}
                  className="ml-auto text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition"
                >
                  Agent Prompts
                </button>
                <button
                  onClick={handlePdfUploadClick}
                  disabled={isUploadingPdf}
                  className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingPdf ? "Uploading..." : "Upload PDF"}
                </button>
              </div>
            </div>

            {pdfStatus && (
              <div className="text-xs text-amber-200 bg-black/30 rounded-2xl p-3">
                <strong className="block text-white/80 mb-1">Latest PDF Summary</strong>
                <p className="whitespace-pre-line leading-relaxed">{pdfStatus}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-[1.1fr_2fr_1fr] gap-6">
              <div className="space-y-4">
                {contextCards.map((card) => (
                  <FlowNodeCard key={card.id} kind="context" title={card.title} subtitle={card.subtitle} />
                ))}
                <FlowNodeCard
                  kind="tool"
                  title={FLOW_STEPS.research.title}
                  subtitle={FLOW_STEPS.research.summary}
                  status={agentFlowState.research?.status}
                  active={selectedAgent === "research"}
                  onClick={() => setSelectedAgent("research")}
                />
              </div>

              <div className="space-y-4">
                <FlowNodeCard
                  kind="agent"
                  title={FLOW_STEPS.router.title}
                  subtitle={FLOW_STEPS.router.summary}
                  status={agentFlowState.router?.status}
                  active={selectedAgent === "router"}
                  onClick={() => setSelectedAgent("router")}
                />
                <div className="relative pl-8 pr-10 space-y-4">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-white/15" />
                  {branchAgents.map((agentId) => {
                    const step = FLOW_STEPS[agentId];
                    const state = agentFlowState[agentId];
                    return (
                      <div key={agentId} className="relative pl-6 pr-10">
                        <div className="absolute left-0 top-1/2 w-6 h-px bg-white/15" />
                        <div className="absolute right-0 top-1/2 w-10 h-px bg-white/25" />
                        <FlowNodeCard
                            kind="agent"
                            title={step.title}
                            subtitle={step.summary}
                            status={state?.status}
                            active={selectedAgent === agentId}
                            onClick={() => setSelectedAgent(agentId)}
                          />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 relative">
                <div className="absolute -left-6 top-0 bottom-0 w-px bg-white/10" />
                <FlowNodeCard
                  kind="output"
                  title={FLOW_STEPS.synth.title}
                  subtitle={FLOW_STEPS.synth.summary}
                  status={agentFlowState.synth?.status}
                  active={selectedAgent === "synth"}
                  onClick={() => setSelectedAgent("synth")}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#1f232b] rounded-3xl p-4 overflow-y-auto border border-white/10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{selectedStep.title}</h3>
                  {selectedStep.optional && (
                    <span className="text-[10px] uppercase tracking-wide border border-white/20 rounded-full px-2 py-0.5 text-white/60">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60">{selectedStep.summary}</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wide ${selectedStatusConfig.color}`}>
                {selectedStatusConfig.label}
              </span>
            </div>
            <div className="mt-4 bg-black/30 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap text-white/90 min-h-[220px] border border-white/5">
              {selectedOutput}
            </div>
          </div>
        </div>
      </main>

      <section className="px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center bg-[#ceb06d] text-black rounded-2xl px-3 py-2 focus-within:ring-4 focus-within:ring-white/40 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={isSending ? "Running..." : "Ask anything..."}
                className="flex-1 bg-transparent outline-none text-base placeholder-black/60"
              />
              <button
                className="text-xs font-semibold uppercase tracking-wide"
                onClick={handleSubmit}
                disabled={isSending}
              >
                Send
              </button>
            </div>
          </div>
          <button
            className="w-12 rounded-2xl bg-[#d7a647] text-black font-bold shadow-lg"
            onClick={() => setCommandSheetOpen((open) => !open)}
          >
            /
          </button>
          <button
            className="w-12 rounded-2xl bg-[#d7a647] text-black font-bold"
            onClick={handlePdfUploadClick}
            disabled={isUploadingPdf}
          >
            +
          </button>
        </div>
      </section>

      {commandSheetOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-[#2b303b] rounded-t-3xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-white/70">
                Commands
              </span>
              <button onClick={() => setCommandSheetOpen(false)} className="text-white/60 text-sm">
                Close
              </button>
            </div>
            <div className="space-y-2">
              {COMMANDS.map((command) => (
                <button
                  key={command}
                  onClick={() => handleCommandClick(command)}
                  className="w-full text-left px-4 py-3 rounded-2xl bg-[#1f232b] text-lg font-semibold hover:bg-[#353b47]"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {promptModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-[#1a1f29] rounded-3xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row gap-6 shadow-2xl">
            <div className="md:w-1/3 space-y-4 overflow-y-auto pr-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Agent Prompts</h3>
                  <p className="text-sm text-white/60">View or edit the system prompt for each agent.</p>
                </div>
                <button className="text-white/60 hover:text-white text-sm" onClick={() => setPromptModalOpen(false)}>
                  Close
                </button>
              </div>
              {PROMPT_METADATA.map((prompt) => {
                const isActive = activePromptId === prompt.id;
                return (
                  <button
                    key={prompt.id}
                    onClick={() => setActivePromptId(prompt.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                      isActive ? "border-white/50 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-semibold">{prompt.label}</div>
                    <p className="text-xs text-white/60">{prompt.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold">{PROMPT_METADATA.find((p) => p.id === activePromptId)?.label}</h4>
                <span className="text-xs text-white/60">
                  {promptLoading ? "Loading..." : promptSaving ? "Saving..." : "Editable"}
                </span>
              </div>
              <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm leading-relaxed text-white/90 resize-none focus:outline-none focus:ring-2 focus:ring-[#ceb06d]"
                placeholder="Agent instructions..."
                disabled={promptLoading}
              />
              {promptError && <p className="text-sm text-rose-400">{promptError}</p>}
              <div className="flex items-center justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition"
                  onClick={() => setPromptModalOpen(false)}
                >
                  Close
                </button>
                <button
                  className="px-5 py-2 rounded-full bg-[#ceb06d] text-black font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePromptSave}
                  disabled={promptSaving || promptLoading}
                >
                  Save Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfSummaries.length > 0 && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-full max-w-3xl z-40 px-4">
          <div className="bg-[#1b222f] border border-white/10 rounded-2xl shadow-xl px-4 py-3 text-sm text-white/80 flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-semibold text-white text-base">Recent PDF Summaries</span>
                <span className="ml-3 text-xs text-white/60">
                  {pdfSummaries.length} file{pdfSummaries.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  className="px-3 py-1 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition"
                  onClick={() => setPdfSummaries([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {pdfSummaries.map((entry) => (
                <div key={entry.id} className="bg-white/5 rounded-xl px-3 py-2 text-xs text-white/90 min-w-[220px]">
                  <p className="whitespace-pre-line leading-relaxed">{entry.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#ceb06d] text-black px-6 py-2 rounded-full shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={handlePdfSelected}
      />
    </div>
  );
}

