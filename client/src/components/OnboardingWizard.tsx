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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            System Reset Logs
          </h3>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-700">
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
        <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4 font-mono text-xs text-gray-600">
          {logs.map((log, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-3 py-0.5">
              <span className="mr-2 text-gray-400">[{String(i + 1).padStart(2, "0")}]</span>
              {log}
            </div>
          ))}
          <div className="mt-4 border-t border-gray-200 pt-2 font-bold text-green-600">
            ✓ Reset Sequence Complete
          </div>
        </div>
        <div className="border-t border-gray-100 bg-white p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 py-2 text-xs font-bold uppercase tracking-widest text-gray-900 transition-colors hover:bg-gray-200"
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
        title: "Profile 👤",
        color: "text-amber-500",
        badge: "Step 1",
        headline: "Profile Builder",
        description: "Short, direct answers only. Think LinkedIn bio + general goal in life at a 5 10 years horizon.",
        instructions: [],
        gradient: "from-amber-500/10 via-amber-400/5 to-transparent",
        chromeTone: "bg-white text-black",
        flowId: "flow_profile",
        seed: "Give me three short bullets about you to start the profile.",
        placeholder: "Ex: Solo founder in Paris · ex-Stripe PM",
        vibe: {
          badge: "FOUNDER PROFILER",
          description: "Rapid-fire questions to lock your bio. Keep each reply under 25 words.",
          accentClass: "text-amber-500",
          panelClassName: "bg-white"
        }
      },
      idea: {
        index: 2,
        title: "Ideation 💡",
        color: "text-cyan-500",
        badge: "Step 2",
        headline: "Ideation Lab",
        description: "We’ll search fresh trends, propose 4 non-obvious plays, then pressure-test yours.",
        instructions: [],
        gradient: "from-cyan-500/10 via-cyan-400/5 to-transparent",
        chromeTone: "bg-white text-black",
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
        title: "Sprint ⚡️",
        color: "text-rose-500",
        badge: "Step 3",
        headline: "90min Sprint",
        description: "No theory. Tactical checklists with a clear definition of done.",
        instructions: [],
        gradient: "from-rose-500/10 via-rose-400/5 to-transparent",
        chromeTone: "bg-white text-black",
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
        title: "Verdict 🏁",
        color: "text-emerald-500",
        badge: "Step 5",
        headline: "Verdict",
        description: "Synthesized mentor output coming soon.",
        instructions: [],
        gradient: "from-emerald-500/10 via-emerald-400/5 to-transparent",
        chromeTone: "bg-white text-black"
      },
      console: {
        index: 6,
        title: "Console 🖥️",
        color: "text-sky-500",
        badge: "Console",
        headline: "Console",
        description: "Ask anything. Router will pick the right mentors.",
        instructions: [],
        gradient: "from-sky-500/10 via-sky-400/5 to-transparent",
        chromeTone: "bg-white text-black",
        flowId: "flow_console",
        placeholder: "Ask anything. Ex: How do I pitch this seed round?",
        vibe: {
          badge: "TERMINAL MODE",
          description: "Multi-agent console. Expect colored logs + streaming answers.",
          accentClass: "text-sky-500",
          panelClassName: "bg-white"
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
      "text-sky-300": { hex: "#0ea5e9", pastel: "rgba(14, 165, 233, 0.5)" }, // Bright blue
      
      // 500 variants for light mode
      "text-yellow-500": { hex: "#eab308", pastel: "rgba(234, 179, 8, 0.6)" },
      "text-amber-500": { hex: "#f59e0b", pastel: "rgba(245, 158, 11, 0.6)" },
      "text-cyan-500": { hex: "#06b6d4", pastel: "rgba(6, 182, 212, 0.6)" },
      "text-rose-500": { hex: "#f43f5e", pastel: "rgba(244, 63, 94, 0.6)" },
      "text-violet-500": { hex: "#8b5cf6", pastel: "rgba(139, 92, 246, 0.6)" },
      "text-emerald-500": { hex: "#10b981", pastel: "rgba(16, 185, 129, 0.6)" },
      "text-sky-500": { hex: "#0ea5e9", pastel: "rgba(14, 165, 233, 0.6)" }
    };
    
    // Safety: default to yellow-300 if color is undefined or not found
    const targetColor = color && colorMap[color] ? color : "text-yellow-300";
    const mapping = colorMap[targetColor] || colorMap["text-yellow-300"];
    
    return {
      hex: mapping.hex,
      pastel: mapping.pastel,
      tailwindColor: targetColor
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
          const tokens = colorToTokens(meta.color);
          
          return (
            <React.Fragment key={stageKey}>
              {idx > 0 && (
                <div className={`h-px w-8 ${isComplete ? "bg-green-500" : "bg-gray-700"}`} />
              )}
              <button
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  isComplete 
                    ? "bg-green-500/20 text-green-400 border border-green-500/50" 
                    : isActive 
                    ? "border border-transparent shadow-lg"
                    : "bg-gray-800/50 text-gray-400 border border-gray-700"
                } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                style={isActive && !isComplete ? {
                  backgroundColor: tokens.pastel,
                  color: "#ffffff",
                  borderColor: tokens.hex
                } : {}}
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
    <div className={`px-5 py-6 bg-gradient-to-r ${currentConfig.gradient} border-white/5`}>
      <p className="text-[11px] uppercase tracking-[0.4em] text-white/60 mb-2">{currentConfig.badge}</p>
      <h1 className="text-2xl font-bold text-white mb-1">{currentConfig.headline}</h1>
      <p className="text-sm text-white/70 max-w-2xl">{currentConfig.description}</p>
      {currentConfig.instructions.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 text-sm text-white/80">
          {currentConfig.instructions.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 bg-white/5 rounded-md px-3 py-2 border border-white/10"
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
        <div className="p-10 text-center text-gray-500">
          <h2 className="text-2xl text-white mb-4">Step 5: Verdict</h2>
          <p>[Coming Soon: Synthesizer Verdict]</p>
          <button onClick={() => setStep("console")} className="mt-4 text-yellow-400 border border-yellow-400 px-4 py-2 rounded">Enter Console</button>
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
