import { useEffect, useMemo, useRef, useState } from "react";
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
    { id: "dashboard", label: "Home", icon: Home, accent: "from-[#38bdf8] via-[#6366f1] to-[#a855f7]" },
    { id: "ideas", label: "Ideas", icon: Lightbulb, accent: "from-[#a855f7] to-[#ec4899]" },
    { id: "build", label: "Build 90", icon: Hammer, accent: "from-[#22c55e] to-[#bef264]" },
    { id: "founder", label: "Founder", icon: UserCheck, accent: "from-[#14b8a6] to-[#0ea5e9]" },
    { id: "challenge", label: "Challenge", icon: Trophy, accent: "from-[#d97706] to-[#b45309]" },
    { id: "console", label: "Console", icon: Terminal, accent: "from-[#84cc16] to-[#22c55e]" }
  ] as const;

  const SectionCard = ({
    title,
    subtitle,
    actionLabel,
    onAction,
    children
  }: {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    children: React.ReactNode;
  }) => (
    <section className="rounded-[2rem] border border-surface-border bg-surface-card px-5 py-4 shadow-[0_25px_45px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">{title}</p>
            <span className="h-1 w-6 rounded-full bg-[#B0724A]" />
          </div>
          {subtitle && <p className="text-sm text-ink-subtle">{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} className="text-sm font-semibold text-brand flex items-center gap-1">
            {actionLabel} <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  );

  const renderDashboard = () => (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-surface-border bg-white px-6 py-6 text-ink shadow-[0_35px_50px_rgba(15,23,42,0.15)]">
        <p className="text-sm uppercase tracking-[0.3em] text-ink-muted">GitGud Mentor</p>
        <h1 className="mt-2 text-3xl font-semibold leading-snug text-ink">What should we tackle today?</h1>
        <p className="mt-2 text-sm text-ink-subtle">
          Choose a track: unlock an idea, build in 90 minutes, know your founder type, or prep for the 9-day challenge.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Find an idea", chip: "12 packs live", icon: Lightbulb },
            { label: "Resume build sprint", chip: "Step 3 of 6", icon: Hammer }
          ].map((cta) => (
            <button
              key={cta.label}
              className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-panel px-4 py-3 text-left text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={() => setActiveTab(cta.label.includes("idea") ? "ideas" : "build")}
            >
              <div>
                <p className="text-sm font-semibold">{cta.label}</p>
                <span className="text-xs text-ink-muted">{cta.chip}</span>
              </div>
              <cta.icon className="h-5 w-5 text-brand" />
            </button>
          ))}
        </div>
        <div className="mt-5 hidden md:flex md:flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={`hero-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1 rounded-2xl border border-surface-border px-3 py-2 text-sm font-semibold transition",
                activeTab === tab.id
                  ? cn("text-white shadow-lg bg-gradient-to-r", tab.accent)
                  : "bg-white text-ink hover:text-ink"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <SectionCard title="Pulse" subtitle="Where you left off">
        <div className="grid gap-3 sm:grid-cols-3 text-ink">
          {[
            { label: "Idea drafts", value: "7 saved", hint: "3 shortlisted" },
            { label: "Build streak", value: "4 days", hint: "Keep momentum" },
            { label: "Challenge status", value: "Day 3 of 9", hint: "MVP checkpoint" }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-muted">{stat.label}</p>
              <p className="text-xl font-semibold text-ink">{stat.value}</p>
              <p className="text-xs text-ink-subtle">{stat.hint}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Latest mentor drop"
        subtitle="Highlights from your PDF or search context"
        actionLabel="See console"
        onAction={() => setActiveTab("console")}
      >
        <div className="rounded-2xl border border-surface-border bg-white px-4 py-4 text-sm text-ink-subtle">
          <p className="mb-1 font-semibold text-ink">VC dossier · Uploaded 2h ago</p>
          The deck leans heavy on solution. Add a 3-slide LP story: asset allocation shift, your edge, and near-term
          liquidity options.
        </div>
      </SectionCard>
    </div>
  );

  const renderIdeas = () => (
    <div className="space-y-4">
      <SectionCard title="Idea packs" subtitle="High-signal prompts curated for you">
        <div className="grid gap-4 sm:grid-cols-2">
          {ideaPacks.map((pack) => (
            <div
              key={pack.title}
              className={cn(
                "rounded-[1.5rem] bg-gradient-to-br px-5 py-6 text-white shadow-lg",
                `via-white/10 ${pack.gradient}`
              )}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">{pack.theme}</p>
              <h3 className="mt-2 text-2xl font-semibold">{pack.title}</h3>
              <p className="mt-1 text-sm text-white/80">{pack.effort}</p>
              <button
                onClick={() => setActiveTab("console")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink"
              >
                Ask mentor <Sparkles className="h-4 w-4 text-brand" />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Signals" subtitle="Live router searches">
        <div className="flex flex-wrap gap-2">
          {["AI + LatAm ops", "LP reporting", "Space SaaS", "Creator banking"].map((chip) => (
            <span key={chip} className="rounded-full bg-surface-accent px-3 py-1 text-xs font-semibold text-ink">
              {chip}
            </span>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const renderBuild = () => (
    <div className="space-y-4">
      <SectionCard title="90-minute build" subtitle="Structured sprint">
        <div className="space-y-3">
          {buildSteps.map((step) => (
            <div
              key={step.title}
              className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3"
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                  step.status === "done" && "bg-brand text-brand-ink",
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
      </SectionCard>
    </div>
  );

  const renderFounder = () => (
    <div className="space-y-4">
      <SectionCard title="Founder archetype" subtitle="Scores refresh after each build">
        <div className="grid gap-4 sm:grid-cols-2">
          {archetypes.map((arc) => (
            <div key={arc.name} className="rounded-2xl border border-surface-border bg-white px-4 py-4 shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-ink">{arc.name}</p>
                <span className="text-2xl font-bold text-brand">{arc.score}</span>
              </div>
              <p className="mt-2 text-sm text-ink-subtle">{arc.copy}</p>
              <span className="mt-3 inline-flex rounded-full bg-surface-accent px-3 py-1 text-xs font-semibold text-ink">
                {arc.chip}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Next diagnostic" subtitle="2 min micro quiz unlocks tips" actionLabel="Start quiz">
        <div className="rounded-2xl border border-dashed border-surface-border px-4 py-5 text-sm text-ink-subtle">
          “How do you document learnings?” + “How do you validate pricing?” <br />
          Router uses this to tune the mentor stack.
        </div>
      </SectionCard>
    </div>
  );

  const renderChallenge = () => (
    <div className="space-y-4">
      <SectionCard title="9-day funding challenge" subtitle="$30k+ fast track">
        <div className="grid gap-3 sm:grid-cols-3">
          {challengeDays.map((day) => (
            <div
              key={day.day}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm shadow-sm",
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
      </SectionCard>

      <SectionCard title="Challenge checklist" subtitle="Proofs required">
        <ul className="space-y-3 text-sm text-ink-subtle">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-brand" />
            Upload clips of 3 LP interviews validating appetite.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-surface-accent" />
            Ship 1-minute Loom demo of MVP stub.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-surface-accent" />
            Summarize risk plan for week 2 and who covers it.
          </li>
        </ul>
      </SectionCard>
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

  const appVersion =
    (import.meta.env.VITE_APP_VERSION as string | undefined) ?? (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-28">
        <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">GitGud VC</p>
              <h1 className="text-3xl font-semibold text-ink">Accelerate your next thing.</h1>
            </div>
            <Compass className="h-6 w-6 text-brand" />
          </div>
        </header>

        <main className="flex-1 min-h-0 space-y-4 pb-6">{renderActiveTab()}</main>
        <footer className="mt-auto hidden pb-6 text-xs text-ink-muted md:block">
          GitGud Mentor &middot; build {appVersion}
        </footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-surface-border bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 shadow-[0_-15px_35px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center rounded-2xl px-2 py-2 text-xs font-semibold transition",
                activeTab === tab.id
                  ? cn("text-white shadow-lg bg-gradient-to-r", tab.accent)
                  : "text-ink"
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

