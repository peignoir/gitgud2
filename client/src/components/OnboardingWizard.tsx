import React, { useState } from "react";
import { Layout } from "./Layout";
import { LoginScreen } from "./LoginScreen";
import { ProfileStep } from "./ProfileStep";

type Step = "login" | "profile" | "idea" | "sprint" | "vibecelerator" | "result" | "console";

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

  if (step === "login") {
    return (
      <Layout step={0} totalSteps={0}>
        <LoginScreen onLogin={handleLogin} />
      </Layout>
    );
  }

  const stepMap: Record<Step, number> = {
    login: 0,
    profile: 1,
    idea: 2,
    sprint: 3,
    vibecelerator: 4,
    result: 5,
    console: 6
  };

  return (
    <Layout 
      step={stepMap[step]} 
      totalSteps={6} 
      onReset={handleReset}
    >
      {step === "profile" && (
        <ProfileStep 
          userId={userId} 
          flowId="flow_profile"
          onComplete={() => setStep("idea")} 
        />
      )}
      {step === "idea" && (
        <ProfileStep
          userId={userId}
          flowId="flow_ideation"
          onComplete={() => setStep("sprint")}
          overrideSeed="Let's brainstorm. I'll check market data and propose ideas."
        />
      )}
      {step === "sprint" && (
        <ProfileStep
          userId={userId}
          flowId="flow_sprint"
          onComplete={() => setStep("vibecelerator")}
          overrideSeed="Ready for the 90-minute sprint. What's the plan?"
        />
      )}
      {step === "vibecelerator" && (
        <ProfileStep
          userId={userId}
          flowId="flow_vibecelerator"
          onComplete={() => setStep("result")}
          overrideSeed="Welcome to the 9-Day Vibecelerator. Let's get moving!"
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
          flowId="flow_console"
          onComplete={() => {}} 
          overrideSeed="Console ready. All agents online."
        /> 
      )}
    </Layout>
  );
};
