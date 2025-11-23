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

const ResetLogModal = ({ logs, onClose }: { logs: string[]; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-text-primary">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-surface-soft px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-status-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-status-danger" />
            System Reset Logs
          </h3>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto bg-bg-body p-4 font-mono text-xs text-text-secondary">
          {logs.map((log, i) => (
            <div key={i} className="border-l-2 border-border-subtle pl-3 py-0.5">
              <span className="mr-2 text-text-muted">[{String(i + 1).padStart(2, "0")}]</span>
              {log}
            </div>
          ))}
          <div className="mt-4 border-t border-border-subtle pt-2 font-bold text-status-success">
            ✓ Reset Sequence Complete
          </div>
        </div>
        <div className="border-t border-border-subtle bg-bg-surface p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-bg-surface-soft py-2 text-xs font-bold uppercase tracking-widest text-text-primary transition-colors hover:bg-border-subtle border border-border-subtle"
          >
            Close & Restart
          </button>
        </div>
      </div>
    </div>
  );
};

export const OnboardingWizard = () => {
  const [step, setStep] = useState<Step>("login");
  const [userId, setUserId] = useState<string>("");
  const [resetLogs, setResetLogs] = useState<string[] | null>(null);

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
        const res = await fetch(`${API_BASE_URL}/api/reset`, {
          method: "POST",
          headers: { "x-user-id": userId }
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `Server error ${res.status}`);
        }

        const data = await res.json();

        // Clear specific profile cache to prevent hydration of old data
        localStorage.removeItem(`gitgud_profile_${userId}`);
        localStorage.removeItem("gitgud_userid");

        if (data.logs && Array.isArray(data.logs)) {
          setResetLogs(data.logs.length > 0 ? data.logs : ["Reset performed successfully."]);
        } else {
          setResetLogs(["Reset performed (no logs returned)."]);
        }
      } catch (e) {
        console.error("Reset failed", e);
        alert("Reset failed: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  const closeResetModal = () => {
    setResetLogs(null);
    setUserId("");
    setStep("login");
  };

  const stageOrder: Step[] = ["login", "profile", "idea", "sprint", "vibecelerator", "result", "console"];

  const stepConfig: Record<Step, StepMeta> = useMemo(
    () => ({
      login: {
        index: 0,
        title: "Login",
        color: "text-brand-primary",
        badge: "Stage 1 · Welcome",
        headline: "GitGud Accelerator",
        description: "Your AI-powered path from idea to execution in 9 days and 90 minutes.",
        instructions: [],
        gradient: "from-brand-primary/20 via-brand-primary/5 to-transparent",
        chromeTone: "bg-bg-surface"
      },
      profile: {
        index: 1,
        title: "Profile 👤",
        color: "text-accent-yellow",
        badge: "Step 1",
        headline: "Profile Builder",
        description: "Short, direct answers only. Think LinkedIn bio + general goal in life at a 5 10 years horizon.",
        instructions: [],
        gradient: "from-accent-yellow/10 via-accent-yellow/5 to-transparent",
        chromeTone: "bg-bg-surface",
        flowId: "flow_profile",
        seed: "Give me three short bullets about you to start the profile.",
        placeholder: "Ex: Solo founder in Paris · ex-Stripe PM",
        vibe: {
          badge: "FOUNDER PROFILER",
          description: "Rapid-fire questions to lock your bio. Keep each reply under 25 words.",
          accentClass: "text-accent-yellow",
          panelClassName: "bg-bg-surface"
        }
      },
      idea: {
        index: 2,
        title: "Ideation 💡",
        color: "text-accent-blue",
        badge: "Step 2",
        headline: "Ideation Lab",
        description: "We’ll search fresh trends, propose 4 non-obvious plays, then pressure-test yours.",
        instructions: [],
        gradient: "from-accent-blue/10 via-accent-blue/5 to-transparent",
        chromeTone: "bg-bg-surface",
        flowId: "flow_ideation",
        seed: "Scan latest trends + my profile, propose 4 novel startup ideas. End by asking which resonates.",
        placeholder: "Tell me which idea resonates or pitch yours.",
        vibe: {
          badge: "IDEATION PARTNER",
          description: "We scan 2025 trendlines + your profile to pitch 4 unique bets. React fast.",
          accentClass: "text-accent-blue",
          panelClassName: "bg-bg-surface"
        }
      },
      sprint: {
        index: 3,
        title: "Sprint ⚡️",
        color: "text-status-danger",
        badge: "Step 3",
        headline: "90min Sprint",
        description: "No theory. Tactical checklists with a clear definition of done.",
        instructions: [],
        gradient: "from-status-danger/10 via-status-danger/5 to-transparent",
        chromeTone: "bg-bg-surface",
        flowId: "flow_sprint",
        seed: "Design a 90-minute execution plan for the chosen idea. Keep it brutal and specific.",
        placeholder: "Ex: Need to validate landing page copy today.",
        vibe: {
          badge: "SPRINT COACH",
          description: "Bite-sized tasks, 30-minute blocks. Expect ruthless focus.",
          accentClass: "text-status-danger",
          panelClassName: "bg-bg-surface"
        }
      },
      vibecelerator: {
        index: 4,
        title: "Vibecelerator 🚀",
        color: "text-accent-purple",
        badge: "Step 4",
        headline: "9-Day Vibecelerator",
        description: "Momentum bootcamp, 9-day arc.",
        instructions: [],
        gradient: "from-accent-purple/10 via-accent-purple/5 to-transparent",
        chromeTone: "bg-bg-surface",
        flowId: "flow_vibecelerator",
        seed: "Kick off Day 1 of the 9-Day Vibecelerator for this founder. Keep it under 50 words.",
        placeholder: "Log progress or drop a link.",
        vibe: {
          badge: "VIBECELERATOR COACH",
          description: "High-energy check-ins. Micro challenges + vibe tracking.",
          accentClass: "text-accent-purple",
          panelClassName: "bg-bg-surface"
        }
      },
      result: {
        index: 5,
        title: "Verdict 🏁",
        color: "text-brand-primary",
        badge: "Step 5",
        headline: "Verdict",
        description: "Synthesized mentor output coming soon.",
        instructions: [],
        gradient: "from-brand-primary/10 via-brand-primary/5 to-transparent",
        chromeTone: "bg-bg-surface"
      },
      console: {
        index: 6,
        title: "Console 🖥️",
        color: "text-accent-blue",
        badge: "Console",
        headline: "Console",
        description: "Ask anything. Router will pick the right mentors.",
        instructions: [],
        gradient: "from-accent-blue/10 via-accent-blue/5 to-transparent",
        chromeTone: "bg-bg-surface",
        flowId: "flow_console",
        placeholder: "Ask anything. Ex: How do I pitch this seed round?",
        vibe: {
          badge: "TERMINAL MODE",
          description: "Multi-agent console. Expect colored logs + streaming answers.",
          accentClass: "text-accent-blue",
          panelClassName: "bg-bg-surface"
        }
      }
    }),
    []
  );

  const colorToTokens = (color: string | undefined) => {
    // Simple map for token lookups if needed for inline styles
    // But prefer using class names directly
    return {
      hex: "#22C55E", // Fallback green
      pastel: "rgba(34, 197, 94, 0.2)",
      tailwindColor: color || "text-brand-primary"
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
    <div className="px-4 py-3 overflow-x-auto">
      <div className="flex items-center gap-3 min-w-max">
        {stageOrder.slice(1).map((stageKey, idx) => {
          const index = idx + 1; // Skip login step
          const meta = stepConfig[stageKey];
          const isActive = stageKey === step;
          const isComplete = currentStageIndex > index;
          const isPending = currentStageIndex < index;
          
          // Dynamic classes based on state
          const activeClass = isActive ? `border-${meta.color.replace('text-', '')} bg-bg-surface-soft text-text-primary` : "border-border-subtle bg-transparent text-text-muted";
          const completeClass = isComplete ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "";
          
          return (
            <React.Fragment key={stageKey}>
              {idx > 0 && (
                <div className={`h-px w-8 ${isComplete ? "bg-brand-primary" : "bg-border-subtle"}`} />
              )}
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                  isComplete ? completeClass : activeClass
                } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-text-muted"}`}
                onClick={() => handleStageSelect(stageKey)}
                disabled={isPending}
              >
                {isComplete ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {meta.title}
                  </span>
                ) : (
                  meta.title
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const hero = (
    <div className={`px-5 py-6 bg-gradient-to-r ${currentConfig.gradient} border-b border-border-subtle`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2 font-bold">{currentConfig.badge}</p>
      <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{currentConfig.headline}</h1>
      <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">{currentConfig.description}</p>
      {currentConfig.instructions.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 text-sm text-text-secondary">
          {currentConfig.instructions.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 bg-bg-surface-soft/50 rounded-md px-3 py-2 border border-border-subtle"
            >
              <span className={`${currentConfig.color} text-xs mt-[2px]`}>▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  
  if (step === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  return (
    <Layout 
      step={currentConfig.index}
      totalSteps={6}
      stepTitle={currentConfig.title}
      stepColor={currentConfig.color}
      topNav={stageNav}
      hero={hero}
      onReset={handleReset}
      chromeTone={currentConfig.chromeTone}
      contentClassName={currentConfig.contentClassName}
    >
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
      {step === "idea" && (
        <ProfileStep
          userId={userId}
          flowId={currentConfig.flowId}
          onComplete={() => setStep("sprint")}
          overrideSeed={currentConfig.seed}
          placeholder={currentConfig.placeholder}
          vibe={currentConfig.vibe}
        />
      )}
      {step === "sprint" && (
        <ProfileStep
          userId={userId}
          flowId={currentConfig.flowId}
          onComplete={() => setStep("vibecelerator")}
          overrideSeed={currentConfig.seed}
          placeholder={currentConfig.placeholder}
          vibe={currentConfig.vibe}
        />
      )}
      {step === "vibecelerator" && (
        <ProfileStep
          userId={userId}
          flowId={currentConfig.flowId}
          onComplete={() => setStep("result")}
          overrideSeed={currentConfig.seed}
          placeholder={currentConfig.placeholder}
          vibe={currentConfig.vibe}
        />
      )}
      {step === "result" && (
        <div className="p-10 text-center text-text-muted">
          <h2 className="text-2xl text-text-primary mb-4 font-bold">Step 5: Verdict</h2>
          <p>[Coming Soon: Synthesizer Verdict]</p>
          <button onClick={() => setStep("console")} className="mt-4 text-brand-primary border border-brand-primary px-4 py-2 rounded hover:bg-brand-primary/10 transition-colors">Enter Console</button>
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
      {resetLogs && <ResetLogModal logs={resetLogs} onClose={closeResetModal} />}
    </Layout>
  );
};
