import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from "react";
import MessageBubble from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { CommandSheet } from "@/components/CommandSheet";
import { PdfUploadSheet } from "@/components/PdfUploadSheet";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Compass,
  Hammer,
  Home,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Terminal,
  Trophy,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const App = () => {
  const { messages, sendMessage, isStreaming, cancel } = useChat();
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "ideas" | "build" | "founder" | "challenge" | "console"
  >("dashboard");
  const listRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (value: string) => {
    sendMessage(value);
    setInput("");
  };

  useEffect(() => {
    if (activeTab !== "console") return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, activeTab]);

  const ideaPacks = useMemo(
    () => [
      { title: "Ops Co-Pilot", theme: "AI Infra", effort: "Weekend sprint", gradient: "from-[#6EE7B7] to-[#3B82F6]" },
      { title: "Compliance Radar", theme: "Fintech", effort: "2 weeks", gradient: "from-[#FDE68A] to-[#F97316]" },
      { title: "Creator Treasury", theme: "Consumer", effort: "90 minutes", gradient: "from-[#FBCFE8] to-[#EC4899]" }
    ],
    []
  );

  const buildSteps = useMemo(
    () => [
      { title: "Problem Snapshot", status: "done", eta: "12 min" },
      { title: "Customer Persona", status: "done", eta: "18 min" },
      { title: "MVP Outline", status: "in-progress", eta: "live" },
      { title: "Demo Script", status: "next", eta: "12 min" },
      { title: "Pitch Hook", status: "next", eta: "14 min" }
    ],
    []
  );

  const archetypes = useMemo(
    () => [
      {
        name: "Systems Hacker",
        score: 82,
        copy: "Turns constraints into APIs. Thrives with fast iteration and direct feedback.",
        chip: "Technical"
      },
      {
        name: "Market Whisperer",
        score: 68,
        copy: "Sees whitespace in messy categories. Great at zero-to-one storytelling.",
        chip: "Story"
      }
    ],
    []
  );

  const challengeDays = useMemo(
    () => [
      { day: 1, label: "Thesis & stakes", status: "done" },
      { day: 2, label: "Signal capture", status: "done" },
      { day: 3, label: "MVP stub", status: "active" },
      { day: 4, label: "LP proof", status: "pending" },
      { day: 5, label: "Router review", status: "pending" },
      { day: 6, label: "Synthesis", status: "pending" },
      { day: 7, label: "Runway math", status: "pending" },
      { day: 8, label: "Deck polish", status: "pending" },
      { day: 9, label: "Funding pitch", status: "pending" }
    ],
    []
  );

const tabs = [
  { id: "dashboard", label: "Home", icon: Home, accent: "from-[#5EEAD4] to-[#38BDF8]" },
  { id: "ideas", label: "Ideas", icon: Lightbulb, accent: "from-[#A855F7] to-[#EC4899]" },
  { id: "build", label: "Build 90", icon: Hammer, accent: "from-[#FACC15] to-[#FB923C]" },
  { id: "founder", label: "Founder", icon: UserCheck, accent: "from-[#2AD1A3] to-[#0EA5E9]" },
  { id: "challenge", label: "Challenge", icon: Trophy, accent: "from-[#F97316] to-[#EA580C]" },
  { id: "console", label: "Console", icon: Terminal, accent: "from-[#A3E635] to-[#22C55E]" }
] as const;

const SectionShell = ({
  kicker,
  title,
  description,
  actionLabel,
  onAction,
  children
}: {
  kicker?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) => (
  <section className="rounded-[32px] border border-surface-border bg-white px-6 py-6 shadow-card space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        {kicker && <p className="text-[11px] uppercase tracking-[0.3em] text-ink-muted">{kicker}</p>}
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-subtle">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-full border border-surface-border px-3 py-1 text-sm font-semibold text-ink hover:bg-surface-panel"
        >
          {actionLabel}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      )}
    </div>
    {children}
  </section>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-4 shadow-card">
    <div className="h-12 w-12 rounded-2xl bg-surface-panel text-brand flex items-center justify-center">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-ink-muted">{label}</p>
      <p className="text-xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-subtle">{hint}</p>
    </div>
  </div>
);

  const renderDashboard = () => (
    <div className="space-y-5">
      <section className="rounded-[36px] border border-white/60 bg-gradient-to-br from-[#fff7ec] via-white to-[#e3f0ff] px-6 py-7 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">GitGud Mentor</p>
        <h1 className="mt-3 text-3xl font-semibold text-ink">What should we tackle today?</h1>
        <p className="mt-2 text-base text-ink-subtle">
          Pick a lane: unlock a vetted idea, sprint an MVP in 90 minutes, get your founder archetype, or prep for the 9-day
          funding challenge.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Find an idea", chip: "12 packs live", icon: Lightbulb, tab: "ideas" as const },
            { label: "Resume build sprint", chip: "Step 3 of 6", icon: Hammer, tab: "build" as const }
          ].map((cta) => (
            <button
              key={cta.label}
              className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-left text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setActiveTab(cta.tab)}
            >
              <div>
                <p className="text-base font-semibold">{cta.label}</p>
                <span className="text-sm text-ink-muted">{cta.chip}</span>
              </div>
              <cta.icon className="h-5 w-5 text-brand" />
            </button>
          ))}
        </div>
        <div className="mt-5 hidden md:grid grid-cols-3 gap-3">
          {tabs.map((tab) => (
            <button
              key={`hero-nav-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border border-white/70 px-3 py-2 text-sm font-semibold transition",
                activeTab === tab.id ? cn("text-white shadow-card bg-gradient-to-r", tab.accent) : "bg-white/90 text-ink"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <SectionShell kicker="Pulse" title="Where you left off">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={Lightbulb} label="Idea drafts" value="7 saved" hint="3 shortlisted" />
          <StatCard icon={Hammer} label="Build streak" value="4 days" hint="Keep momentum" />
          <StatCard icon={Trophy} label="Challenge status" value="Day 3 of 9" hint="MVP checkpoint" />
        </div>
      </SectionShell>

      <SectionShell
        kicker="Latest mentor drop"
        title="Highlights from your PDF or search context"
        actionLabel="See console"
        onAction={() => setActiveTab("console")}
      >
        <div className="rounded-2xl border border-surface-border bg-white px-4 py-4 text-sm text-ink-subtle shadow-inner">
          <p className="mb-1 text-base font-semibold text-ink">VC dossier · Uploaded 2h ago</p>
          The deck leans heavy on solution. Add a 3-slide LP story: asset allocation shift, your edge, and near-term liquidity
          options.
        </div>
      </SectionShell>
    </div>
  );

  const renderIdeas = () => (
    <div className="space-y-5">
      <SectionShell
        kicker="Idea packs"
        title="High-signal prompts curated for you"
        description="These are refreshed every day based on router searches and your founder profile."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {ideaPacks.map((pack) => (
            <div
              key={pack.title}
              className={cn("rounded-[28px] px-5 py-6 text-white shadow-card bg-gradient-to-br", `via-white/10 ${pack.gradient}`)}
            >
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">{pack.theme}</p>
              <h3 className="mt-2 text-2xl font-semibold">{pack.title}</h3>
              <p className="mt-1 text-sm text-white/85">{pack.effort}</p>
              <button
                onClick={() => setActiveTab("console")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink"
              >
                Ask mentor <Sparkles className="h-4 w-4 text-brand" />
              </button>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Signals" title="Live router searches">
        <div className="flex flex-wrap gap-2">
          {["AI + LatAm ops", "LP reporting", "Space SaaS", "Creator banking"].map((chip) => (
            <span key={chip} className="rounded-full bg-surface-accent px-4 py-1.5 text-xs font-semibold text-ink">
              {chip}
            </span>
          ))}
        </div>
      </SectionShell>
    </div>
  );

  const renderBuild = () => (
    <div className="space-y-5">
      <SectionShell kicker="90-minute build" title="Structured sprint">
        <div className="space-y-3">
          {buildSteps.map((step) => (
            <div
              key={step.title}
              className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card"
            >
              <div
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-semibold",
                  step.status === "done" && "bg-brand text-white",
                  step.status === "in-progress" && "bg-surface-accent text-ink",
                  step.status === "next" && "bg-surface-panel text-ink-muted"
                )}
              >
                {step.status === "done" ? "✓" : step.status === "in-progress" ? "•" : "→"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="text-xs text-ink-subtle">{step.status === "in-progress" ? "Live now" : step.eta}</p>
              </div>
              <button className="text-sm font-semibold text-brand">Open</button>
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  );

  const renderFounder = () => (
    <div className="space-y-5">
      <SectionShell kicker="Founder archetype" title="Scores refresh after each build">
        <div className="grid gap-4 sm:grid-cols-2">
          {archetypes.map((arc) => (
            <div key={arc.name} className="rounded-2xl border border-surface-border bg-white px-4 py-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-ink">{arc.name}</p>
                <span className="text-3xl font-bold text-brand">{arc.score}</span>
              </div>
              <p className="mt-2 text-sm text-ink-subtle">{arc.copy}</p>
              <span className="mt-3 inline-flex rounded-full bg-surface-accent px-3 py-1 text-xs font-semibold text-ink">
                {arc.chip}
              </span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Next diagnostic" title="2 min micro quiz unlocks tips" actionLabel="Start quiz">
        <div className="rounded-2xl border border-dashed border-surface-border px-4 py-5 text-sm text-ink-subtle">
          “How do you document learnings?” + “How do you validate pricing?” <br />
          Router uses this to tune the mentor stack.
        </div>
      </SectionShell>
    </div>
  );

  const renderChallenge = () => (
    <div className="space-y-5">
      <SectionShell kicker="9-day funding challenge" title="$30k+ fast track">
        <div className="grid gap-3 sm:grid-cols-3">
          {challengeDays.map((day) => (
            <div
              key={day.day}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm shadow-card",
                day.status === "done" && "border-brand bg-brand/10 text-brand-ink",
                day.status === "active" && "border-ink text-ink bg-white",
                day.status === "pending" && "border-surface-border text-ink-muted bg-surface-panel"
              )}
            >
              <p className="text-xs uppercase tracking-[0.25em]">{`Day ${day.day}`}</p>
              <p className="font-semibold">{day.label}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Challenge checklist" title="Proofs required">
        <ul className="space-y-3 text-sm text-ink-subtle">
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
            Upload clips of 3 LP interviews validating appetite.
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent-teal" />
            Ship 1-minute Loom demo of MVP stub.
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent-orange" />
            Summarize risk plan for week 2 and who covers it.
          </li>
        </ul>
      </SectionShell>
    </div>
  );

  const renderConsole = () => (
    <div className="flex min-h-[60vh] flex-col rounded-[2rem] border border-surface-border bg-[#0e111b] text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Agent console</p>
          <p className="text-sm text-white/80">Live router output · SSE stream</p>
        </div>
        <div className="flex items-center gap-2">
          <CommandSheet onCommand={(command) => setInput((prev) => `${command} ${prev}`.trim())} />
          <PdfUploadSheet />
        </div>
      </div>
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isStreaming && (
          <Button variant="ghost" size="sm" className="mx-auto text-xs text-white/70" onClick={cancel}>
            <RefreshCw className="mr-2 h-4 w-4" /> Stop response
          </Button>
        )}
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "ideas":
        return renderIdeas();
      case "build":
        return renderBuild();
      case "founder":
        return renderFounder();
      case "challenge":
        return renderChallenge();
      case "console":
        return renderConsole();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">GitGud VC</p>
              <h1 className="text-3xl font-semibold text-ink">Accelerate your next thing.</h1>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-brand shadow-card flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Router ready
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 space-y-5">{renderActiveTab()}</main>
      </div>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t border-surface-border/80 bg-white/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-20px_40px_rgba(15,23,42,0.12)] backdrop-blur-lg">
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center rounded-2xl px-2 py-2 text-xs font-semibold transition",
                activeTab === tab.id ? cn("text-white shadow-card bg-gradient-to-r", tab.accent) : "text-ink-muted"
              )}
            >
              <tab.icon className="mb-1 h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;

