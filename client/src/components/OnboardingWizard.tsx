import React, { useMemo, useState } from "react";
import { Layout } from "./Layout";
import { LoginScreen } from "./LoginScreen";
import { ProfileStep } from "./ProfileStep";

type Step = "login" | "profile" | "idea" | "sprint" | "vibecelerator" | "result" | "console";

type StepMeta = {
  index: number;
  title: string;
  color: string;
  badge: string;
  headline: string;
  description: string;
  instructions: string[];
  gradient: string;
  chromeTone?: string;
  contentClassName?: string;
  flowId?: string;
  seed?: string;
  placeholder?: string;
  vibe?: React.ComponentProps<typeof ProfileStep>["vibe"];
};

const StepSummary = ({ meta }: { meta: StepMeta }) => {
  const quickTips = meta.instructions.slice(0, 2);
  return (
    <section className="rounded-3xl border border-white/10 bg-bg-surface px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">{meta.badge}</p>
      <div className="mt-2 space-y-2">
        <h1 className="text-xl font-semibold text-text-primary">{meta.headline}</h1>
        <p className="text-sm text-text-secondary">{meta.description}</p>
      </div>
      {quickTips.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-text-primary opacity-80">
          {quickTips.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const OnboardingWizard = () => {
  const [step, setStep] = useState<Step>("login");
  const [userId, setUserId] = useState<string>("");

  // Load user from local storage on mount
  React.useEffect(() => {
    const storedId = localStorage.getItem("gitgud_userid");
    if (storedId) {
      setUserId(storedId);
      setStep("profile"); // Default to profile for now, in reality we'd fetch state
    }
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const html = document.documentElement;
    if (step === "login") {
      body.classList.add("login-mode");
      html.classList.add("login-mode");
    } else {
      body.classList.remove("login-mode");
      html.classList.remove("login-mode");
    }
    return () => {
      body.classList.remove("login-mode");
      html.classList.remove("login-mode");
    };
  }, [step]);

  const handleLogin = (id: string) => {
    setUserId(id);
    localStorage.setItem("gitgud_userid", id);
    setStep("profile");
  };

  const handleReset = async () => {
    if (!userId) return;
    if (confirm("Are you sure? This will wipe all your data.")) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_BASE_URL}/api/reset`, {
          method: "POST",
          headers: { "x-user-id": userId }
        });
        
        if (!response.ok) {
          throw new Error("Reset request failed");
        }
        
        const data = await response.json();
        
        // Clear all localStorage for this user
        localStorage.removeItem("gitgud_userid");
        localStorage.removeItem(`gitgud_profile_${userId}`);
        
        // Show success message
        alert(`✅ ${data.message || "Reset complete!"}`);
        
        // Redirect to login
        setUserId("");
        setStep("login");
      } catch (e) {
        console.error("Reset failed", e);
        alert("❌ Reset failed: " + (e instanceof Error ? e.message : "Unknown error"));
      }
    }
  };

  const stageOrder: Step[] = ["login", "profile", "idea", "sprint", "vibecelerator", "result", "console"];

  const stepConfig: Record<Step, StepMeta> = useMemo(
    () => ({
      login: {
        index: 0,
        title: "Login",
        color: "text-yellow-300",
        badge: "Stage 1 · Welcome",
        headline: "GitGud Accelerator",
        description: "Your AI-powered path from idea to execution in 9 days and 90 minutes.",
        instructions: [],
        gradient: "from-yellow-500/30 via-yellow-400/5 to-transparent",
        chromeTone: "bg-white text-black"
      },
      profile: {
        index: 1,
        title: "Profile Builder",
        color: "text-amber-300",
        badge: "Step 1 · Identity Scan",
        headline: "Tell us who you are, fast.",
        description: "Short, direct answers only. Think LinkedIn bio + current goal.",
        instructions: [
          "Drop a 1-line bio or LinkedIn.",
          "Share your unfair advantages.",
          "What do you hate/love working on?"
        ],
        gradient: "from-amber-500/30 via-amber-400/5 to-transparent",
        flowId: "flow_profile",
        seed: "Hi! I'm ready to build my founder profile. Please introduce yourself and start the identity scan.",
        placeholder: "Ex: Solo founder in Paris · ex-Stripe PM",
        vibe: {
          badge: "FOUNDER PROFILER",
          description: "Rapid-fire questions to lock your bio. Keep each reply under 25 words.",
          accentClass: "text-amber-300",
          panelClassName: "bg-gradient-to-b from-[#1a1205] via-[#0e0b05] to-[#050305]"
        }
      },
      idea: {
        index: 2,
        title: "Ideation Lab",
        color: "text-cyan-300",
        badge: "Step 2 · Idea Pulse",
        headline: "Co-create four edge ideas.",
        description: "We’ll search fresh trends, propose 4 non-obvious plays, then pressure-test yours.",
        instructions: [
          "Review the four ideas served.",
          "Call out one to explore or add your own.",
          "Highlight unfair advantages or research to run."
        ],
        gradient: "from-cyan-500/30 via-cyan-400/5 to-transparent",
        flowId: "flow_ideation",
        seed: "Scan latest trends + my profile, propose 4 novel startup ideas. End by asking which resonates.",
        placeholder: "Tell me which idea resonates or pitch yours.",
        vibe: {
          badge: "IDEATION PARTNER",
          description: "We scan 2025 trendlines + your profile to pitch 4 unique bets. React fast.",
          accentClass: "text-cyan-300",
          panelClassName: "bg-gradient-to-b from-[#031924] via-[#04101a] to-[#03070d]"
        }
      },
      sprint: {
        index: 3,
        title: "90min Sprint",
        color: "text-rose-300",
        badge: "Step 3 · Execution Drill",
        headline: "Ship something in 90 minutes.",
        description: "No theory. Tactical checklists with a clear definition of done.",
        instructions: [
          "Confirm the idea you’re sprinting on.",
          "Share constraints (tools, audience, time).",
          "Report progress or blockers in-line."
        ],
        gradient: "from-rose-500/30 via-rose-400/5 to-transparent",
        flowId: "flow_sprint",
        seed: "Design a 90-minute execution plan for the chosen idea. Keep it brutal and specific.",
        placeholder: "Ex: Need to validate landing page copy today.",
        vibe: {
          badge: "SPRINT COACH",
          description: "Bite-sized tasks, 30-minute blocks. Expect ruthless focus.",
          accentClass: "text-rose-300",
          panelClassName: "bg-gradient-to-b from-[#21040c] via-[#150308] to-[#050104]"
        }
      },
      vibecelerator: {
        index: 4,
        title: "9-Day Vibecelerator",
        color: "text-violet-300",
        badge: "Step 4 · Vibe Check",
        headline: "Momentum bootcamp, 9-day arc.",
        description: "Each day comes with a challenge + accountability question.",
        instructions: [
          "Acknowledge the day’s challenge.",
          "Share proof of progress (link or description).",
          "Describe mood/energy so we can adjust."
        ],
        gradient: "from-violet-500/30 via-violet-400/5 to-transparent",
        flowId: "flow_vibecelerator",
        seed: "Kick off Day 1 of the 9-Day Vibecelerator for this founder. Keep it under 50 words.",
        placeholder: "Log progress or drop a link.",
        vibe: {
          badge: "VIBECELERATOR COACH",
          description: "High-energy check-ins. Micro challenges + vibe tracking.",
          accentClass: "text-violet-300",
          panelClassName: "bg-gradient-to-b from-[#1a0b27] via-[#0d0715] to-[#04020a]"
        }
      },
      result: {
        index: 5,
        title: "Verdict",
        color: "text-emerald-300",
        badge: "Step 5 · Mentor Verdict",
        headline: "Snap verdict + founder type.",
        description: "Synthesized mentor output coming soon.",
        instructions: [
          "Review sprint + vibe logs.",
          "Tag yourself: Venture / Lifestyle / Impact.",
          "Queue questions for the console."
        ],
        gradient: "from-emerald-500/20 via-emerald-400/5 to-transparent"
      },
      console: {
        index: 6,
        title: "Console",
        color: "text-sky-300",
        badge: "Live Console",
        headline: "Full YC mentor stack back online.",
        description: "Ask anything. Router will pick the right mentors.",
        instructions: [
          "Reference data collected in earlier steps.",
          "Tag requests with desired outcome.",
          "Upload artifacts (deck, sprint proof) when ready."
        ],
        gradient: "from-sky-500/20 via-sky-400/5 to-transparent",
        flowId: "flow_console",
        placeholder: "Ask anything. Ex: How do I pitch this seed round?",
        vibe: {
          badge: "TERMINAL MODE",
          description: "Multi-agent console. Expect colored logs + streaming answers.",
          accentClass: "text-sky-300",
          panelClassName: "bg-gradient-to-b from-[#04121c] via-[#050a11] to-[#020407]"
        }
      }
    }),
    []
  );

  const colorToTokens = (color: string | undefined) => {
    // Map colors to vibrant, distinct pastel colors with good contrast
    const colorMap: Record<string, { hex: string; pastel: string }> = {
      "text-yellow-300": { hex: "#fbbf24", pastel: "rgba(251, 191, 36, 0.6)" }, // Strong yellow
      "text-amber-300": { hex: "#f97316", pastel: "rgba(249, 115, 22, 0.5)" }, // Vibrant orange  
      "text-cyan-300": { hex: "#06b6d4", pastel: "rgba(6, 182, 212, 0.5)" }, // Cool cyan
      "text-rose-300": { hex: "#f43f5e", pastel: "rgba(244, 63, 94, 0.5)" }, // Bright red
      "text-violet-300": { hex: "#8b5cf6", pastel: "rgba(139, 92, 246, 0.5)" }, // Deep purple
      "text-emerald-300": { hex: "#10b981", pastel: "rgba(16, 185, 129, 0.5)" }, // Fresh green
      "text-sky-300": { hex: "#0ea5e9", pastel: "rgba(14, 165, 233, 0.5)" } // Bright blue
    };
    
    const mapping = colorMap[color || "text-yellow-300"];
    return {
      hex: mapping.hex,
      pastel: mapping.pastel,
      tailwindColor: color || "text-yellow-300"
    };
  };
  const currentConfig = stepConfig[step];
  const currentStageIndex = stageOrder.indexOf(step);
  const handleStageSelect = (nextStep: Step) => {
    const nextIndex = stageOrder.indexOf(nextStep);
    if (nextIndex === -1) {
      return;
    }
    if (nextIndex <= currentStageIndex) {
      setStep(nextStep);
    }
  };

  const stageNav = (
    <div className="flex items-center gap-2 py-1">
      {stageOrder.slice(1).map((stageKey) => {
        const meta = stepConfig[stageKey];
        const stageIndex = stageOrder.indexOf(stageKey);
        const isActive = step === stageKey;
        const isComplete = currentStageIndex > stageIndex;
        const isLocked = currentStageIndex < stageIndex;
        const tokens = colorToTokens(meta.color);

        return (
          <button
            key={stageKey}
            disabled={isLocked}
            onClick={() => handleStageSelect(stageKey)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "shadow-lg text-text-inverse"
                : isComplete
                ? "text-text-primary"
                : "text-text-muted"
            } ${isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            style={
              isActive
                ? {
                    backgroundColor: tokens.pastel,
                    borderColor: tokens.hex
                  }
                : isComplete
                ? { borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.04)" }
                : { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "transparent" }
            }
          >
            {meta.title}
          </button>
        );
      })}
    </div>
  );
 
  if (step === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  return (
    <Layout 
      topNav={stageNav}
      onReset={handleReset}
      contentClassName={currentConfig.contentClassName}
    >
      <StepSummary meta={currentConfig} />
      <div className="flex-1 min-h-0">
        {step === "profile" && (
          <ProfileStep
            userId={userId}
            flowId={currentConfig.flowId}
            overrideSeed={currentConfig.seed}
            placeholder={currentConfig.placeholder}
            vibe={currentConfig.vibe}
            onComplete={() => setStep("idea")}
          />
        )}
        {step !== "profile" && step !== "result" && step !== "console" && (
          <ProfileStep
            userId={userId}
            flowId={currentConfig.flowId}
            onComplete={() => {
              const nextStep = stageOrder[currentStageIndex + 1] ?? "result";
              setStep(nextStep);
            }}
            overrideSeed={currentConfig.seed}
            placeholder={currentConfig.placeholder}
            vibe={currentConfig.vibe}
          />
        )}
        {step === "result" && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-bg-surface text-center text-text-secondary">
            <h2 className="text-2xl text-text-primary mb-2">Verdict</h2>
            <p className="text-sm">Synthesizer output coming soon.</p>
            <button
              onClick={() => setStep("console")}
              className="mt-6 rounded-full border border-brand-primary px-5 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-text-inverse transition"
            >
              Enter Console
            </button>
          </div>
        )}
        {step === "console" && (
          <ProfileStep
            userId={userId}
            flowId={currentConfig.flowId}
            onComplete={() => {}}
            overrideSeed={currentConfig.seed}
            placeholder={currentConfig.placeholder}
            vibe={currentConfig.vibe}
          />
        )}
      </div>
    </Layout>
  );
};
