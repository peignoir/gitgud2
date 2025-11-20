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
        badge: "",
        headline: "",
        description: "",
        instructions: [],
        gradient: ""
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
    // Map colors to actual hex values for Safari compatibility
    const colorMap: Record<string, { hex: string; pastel: string }> = {
      "text-yellow-300": { hex: "#fde047", pastel: "rgba(253, 224, 71, 0.4)" },
      "text-amber-300": { hex: "#fbbf24", pastel: "rgba(251, 191, 36, 0.4)" },
      "text-cyan-300": { hex: "#67e8f9", pastel: "rgba(103, 232, 249, 0.4)" },
      "text-rose-300": { hex: "#fda4af", pastel: "rgba(253, 164, 175, 0.4)" },
      "text-violet-300": { hex: "#c4b5fd", pastel: "rgba(196, 181, 253, 0.4)" },
      "text-emerald-300": { hex: "#6ee7b7", pastel: "rgba(110, 231, 183, 0.4)" },
      "text-sky-300": { hex: "#7dd3fc", pastel: "rgba(125, 211, 252, 0.4)" }
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
    <div className="px-4 py-4 bg-gradient-to-b from-[#090c15] to-transparent">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-white/60 mb-3">
        <span>Console Flow</span>
        <span>
          Stage {Math.max(currentStageIndex + 1, 1)} / {stageOrder.length}
        </span>
      </div>
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {stageOrder.map((stageKey, index) => {
          const meta = stepConfig[stageKey];
          const isActive = stageKey === step;
          const isComplete = currentStageIndex > index;
          const tokens = colorToTokens(meta.color ?? "text-yellow-300");
          
          return (
            <div key={stageKey} className="flex items-center gap-4 min-w-max">
              {index > 0 && (
                <div 
                  className="h-px w-8"
                  style={{
                    backgroundColor: currentStageIndex >= index ? tokens.hex : "rgba(255, 255, 255, 0.2)"
                  }}
                />
              )}
              <button
                className={`flex items-center gap-3 rounded-3xl px-3 py-2 text-left transition shadow-lg ${
                  !isActive && !isComplete ? "opacity-70" : ""
                } ${isActive ? "" : "border border-white/25"}`}
                style={{
                  backgroundColor: isActive ? tokens.pastel : "transparent",
                  color: isActive ? "white" : "rgba(255, 255, 255, 0.7)"
                }}
                onClick={() => handleStageSelect(stageKey)}
                disabled={!isComplete && !isActive}
              >
                <div
                  className="h-10 w-10 rounded-2xl border flex items-center justify-center text-sm font-semibold"
                  style={{
                    borderColor: isActive ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)",
                    backgroundColor: isActive ? "rgba(0, 0, 0, 0.2)" : "transparent",
                    color: isActive ? "white" : "rgba(255, 255, 255, 0.8)"
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{
                      color: isActive ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.4)"
                    }}
                  >
                    {meta.badge || `Stage ${index + 1}`}
                  </p>
                  <p 
                    className="text-sm font-semibold"
                    style={{
                      color: isActive ? "white" : "rgba(255, 255, 255, 0.9)"
                    }}
                  >
                    {meta.title}
                  </p>
                </div>
              </button>
            </div>
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
      {step === "login" && (
        <div className="flex h-full items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <LoginScreen onLogin={handleLogin} />
          </div>
        </div>
      )}
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
