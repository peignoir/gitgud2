import React, { useMemo, useState } from "react";
import { Layout } from "./Layout";
import { LoginScreen } from "./LoginScreen";
import { ProfileStep } from "./ProfileStep";

type Step = "login" | "profile" | "idea" | "sprint" | "vibecelerator" | "result" | "console";

type StepMeta = {
  index: number;
  title: string;
  shortTitle: string;
  badge: string;
  headline: string;
  description: string;
  instructions: string[];
  flowId?: string;
  seed?: string;
  placeholder?: string;
  vibe?: React.ComponentProps<typeof ProfileStep>["vibe"];
};

const StepSummary = ({ meta }: { meta: StepMeta }) => {
  const quickTips = meta.instructions.slice(0, 2);
  return (
    <section 
      className="glass rounded-[var(--radius-lg)] border p-[var(--space-lg)]"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      <p 
        className="text-[11px] uppercase tracking-[0.2em] font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        {meta.badge}
      </p>
      <div className="mt-[var(--space-sm)]">
        <h1 
          className="text-[22px] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {meta.headline}
        </h1>
        <p 
          className="text-[15px] mt-[var(--space-xs)] leading-relaxed"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {meta.description}
        </p>
      </div>
      {quickTips.length > 0 && (
        <ul className="mt-[var(--space-md)] space-y-[var(--space-sm)]">
          {quickTips.map((item) => (
            <li 
              key={item} 
              className="flex items-start gap-[var(--space-sm)] text-[14px]"
              style={{ color: 'var(--color-text-soft)' }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
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
    const storedId = localStorage.getItem("ncacc_userid");
    if (storedId) {
      setUserId(storedId);
      setStep("profile");
    }
  }, []);

  const handleLogin = (id: string) => {
    setUserId(id);
    localStorage.setItem("ncacc_userid", id);
    setStep("profile");
  };

  const handleReset = async () => {
    if (!userId) return;
    if (confirm("Start fresh? This will clear your profile and memory.")) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${API_BASE_URL}/api/reset`, {
          method: "POST",
          headers: { "x-user-id": userId }
        });
        
        if (!response.ok) {
          throw new Error("Reset request failed");
        }
        
        // Clear all localStorage for this user
        localStorage.removeItem("ncacc_userid");
        localStorage.removeItem(`ncacc_profile_${userId}`);
        
        // Redirect to login
        setUserId("");
        setStep("login");
      } catch (e) {
        console.error("Reset failed", e);
        alert("Reset failed. Please try again.");
      }
    }
  };

  const stageOrder: Step[] = ["login", "profile", "idea", "sprint", "vibecelerator", "result", "console"];

  const stepConfig: Record<Step, StepMeta> = useMemo(
    () => ({
      login: {
        index: 0,
        title: "Login",
        shortTitle: "Start",
        badge: "Welcome",
        headline: "NC/ACC Accelerator",
        description: "AI-powered coaching from idea to launch.",
        instructions: []
      },
      profile: {
        index: 1,
        title: "Deep Profile",
        shortTitle: "Profile",
        badge: "Phase 1 · Deep Research",
        headline: "Let's understand who you are",
        description: "Share your background and I'll research your history, funding, and network.",
        instructions: [
          "Share your LinkedIn or a quick bio",
          "I'll deep-search your background (2 levels)"
        ],
        flowId: "flow_profile",
        seed: "Share your name and LinkedIn (or a quick bio) and I'll research your background thoroughly.",
        placeholder: "linkedin.com/in/yourname or a quick intro...",
        vibe: {
          badge: "DEEP RESEARCH MODE",
          description: "I'll research your background, funding history, and network.",
          accentClass: "",
          panelClassName: ""
        }
      },
      idea: {
        index: 2,
        title: "Ideation Lab",
        shortTitle: "Ideas",
        badge: "Phase 2 · Creative Ideation",
        headline: "4 non-obvious startup ideas",
        description: "Fresh 2025 trends + your skills = unique opportunities.",
        instructions: [
          "2 ideas using your skills in new industries",
          "2 ideas leveraging your network"
        ],
        flowId: "flow_ideation",
        seed: "Search for 2025 trends and generate 4 non-obvious startup ideas for me.",
        placeholder: "Tell me which idea resonates or pitch your own...",
        vibe: {
          badge: "CREATIVE IDEATION",
          description: "Fresh trends + your unique edges = novel opportunities.",
          accentClass: "",
          panelClassName: ""
        }
      },
      sprint: {
        index: 3,
        title: "90-Min Sprint",
        shortTitle: "Sprint",
        badge: "Phase 3 · Execution",
        headline: "Ship something in 90 minutes",
        description: "Tactical checklist with clear definition of done.",
        instructions: [
          "3 time blocks: 0-30, 30-60, 60-90 min",
          "One proof of progress to share"
        ],
        flowId: "flow_sprint",
        seed: "Create a 90-minute execution plan for my chosen idea.",
        placeholder: "What idea are you sprinting on?",
        vibe: {
          badge: "SPRINT COACH",
          description: "Tactical execution in 30-minute blocks.",
          accentClass: "",
          panelClassName: ""
        }
      },
      vibecelerator: {
        index: 4,
        title: "9-Day Arc",
        shortTitle: "9 Days",
        badge: "Phase 4 · Momentum",
        headline: "9-day momentum bootcamp",
        description: "Daily challenges + accountability.",
        instructions: [
          "One challenge per day",
          "Share proof of progress"
        ],
        flowId: "flow_vibecelerator",
        seed: "Start Day 1 of the 9-Day program.",
        placeholder: "Log your progress or share a link...",
        vibe: {
          badge: "VIBECELERATOR",
          description: "High-energy daily check-ins.",
          accentClass: "",
          panelClassName: ""
        }
      },
      result: {
        index: 5,
        title: "Verdict",
        shortTitle: "Verdict",
        badge: "Summary",
        headline: "Your founder verdict",
        description: "Synthesized insights from your journey.",
        instructions: []
      },
      console: {
        index: 6,
        title: "Console",
        shortTitle: "Console",
        badge: "Open Console",
        headline: "Ask anything",
        description: "Full mentor access with your context.",
        instructions: [
          "All your data is loaded",
          "Ask any founder question"
        ],
        flowId: "flow_console",
        placeholder: "Ask anything about your startup...",
        vibe: {
          badge: "MENTOR CONSOLE",
          description: "Full access to all mentors with your context.",
          accentClass: "",
          panelClassName: ""
        }
      }
    }),
    []
  );

  const currentConfig = stepConfig[step];
  const currentStageIndex = stageOrder.indexOf(step);
  
  const handleStageSelect = (nextStep: Step) => {
    const nextIndex = stageOrder.indexOf(nextStep);
    if (nextIndex === -1) return;
    if (nextIndex <= currentStageIndex) {
      setStep(nextStep);
    }
  };

  const stageNav = (
    <div className="flex items-center gap-[var(--space-sm)] py-1 px-1">
      {stageOrder.slice(1).map((stageKey) => {
        const meta = stepConfig[stageKey];
        const stageIndex = stageOrder.indexOf(stageKey);
        const isActive = step === stageKey;
        const isComplete = currentStageIndex > stageIndex;
        const isLocked = currentStageIndex < stageIndex;

        return (
          <button
            key={stageKey}
            disabled={isLocked}
            onClick={() => handleStageSelect(stageKey)}
            className="spring rounded-[var(--radius-md)] px-[var(--space-md)] text-[12px] font-semibold transition-all"
            style={{
              minHeight: 'var(--tap-min)',
              display: 'flex',
              alignItems: 'center',
              background: isActive 
                ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)' 
                : isComplete 
                ? 'var(--color-accent-soft)' 
                : 'transparent',
              color: isActive 
                ? 'white' 
                : isComplete 
                ? 'var(--color-accent)' 
                : 'var(--color-text-muted)',
              border: `1px solid ${isActive ? 'transparent' : isComplete ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
              opacity: isLocked ? 0.4 : 1,
              cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
          >
            {meta.shortTitle}
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
          <div 
            className="flex flex-1 flex-col items-center justify-center glass rounded-[var(--radius-lg)] border text-center p-[var(--space-xl)]"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <h2 
              className="text-[24px] font-semibold mb-[var(--space-sm)]"
              style={{ color: 'var(--color-text)' }}
            >
              Verdict
            </h2>
            <p 
              className="text-[15px]"
              style={{ color: 'var(--color-text-soft)' }}
            >
              Synthesized insights coming soon.
            </p>
            <button
              onClick={() => setStep("console")}
              className="btn-primary mt-[var(--space-xl)]"
            >
              Open Console →
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
