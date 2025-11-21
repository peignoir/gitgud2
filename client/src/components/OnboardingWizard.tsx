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
        await fetch(`${API_BASE_URL}/api/reset`, {
        method: "POST",
        headers: { "x-user-id": userId }
      });
      localStorage.removeItem("gitgud_userid");
        setUserId("");
        setStep("login");
      } catch (e) {
        console.error("Reset failed", e);
        alert("Reset failed");
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
          "Share current objective (idea, job, raise).",
          "Add where you are + availability."
        ],
        gradient: "from-amber-500/30 via-amber-400/5 to-transparent",
        flowId: "flow_profile",
        seed: "Give me three short bullets about you to start the profile.",
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
    </Layout>
  );
};
