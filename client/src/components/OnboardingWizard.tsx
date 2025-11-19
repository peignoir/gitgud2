import React, { useState } from "react";
import { Layout } from "./Layout";
import { LoginScreen } from "./LoginScreen";
import { ProfileStep } from "./ProfileStep";

type Step = "login" | "profile" | "idea" | "sprint" | "result" | "console";

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
    result: 4,
    console: 5
  };

  return (
    <Layout 
      step={stepMap[step]} 
      totalSteps={5} 
      onReset={handleReset}
    >
      {step === "profile" && (
        <ProfileStep 
          userId={userId} 
          onComplete={() => setStep("idea")} 
        />
      )}
      {/* Placeholders for next steps */}
      {step === "idea" && (
        <div className="p-10 text-center text-gray-500">
          <h2 className="text-2xl text-white mb-4">Step 2: Ideation</h2>
          <p>[Coming Soon: Research Agent Interface]</p>
          <button onClick={() => setStep("sprint")} className="mt-4 text-yellow-400 border border-yellow-400 px-4 py-2 rounded">Next (Debug)</button>
        </div>
      )}
      {step === "sprint" && (
        <div className="p-10 text-center text-gray-500">
          <h2 className="text-2xl text-white mb-4">Step 3: 90min Sprint</h2>
          <p>[Coming Soon: Timer + Upload]</p>
          <button onClick={() => setStep("result")} className="mt-4 text-yellow-400 border border-yellow-400 px-4 py-2 rounded">Next (Debug)</button>
        </div>
      )}
      {step === "result" && (
        <div className="p-10 text-center text-gray-500">
          <h2 className="text-2xl text-white mb-4">Step 4: Results</h2>
          <p>[Coming Soon: Synthesizer Verdict]</p>
          <button onClick={() => setStep("console")} className="mt-4 text-yellow-400 border border-yellow-400 px-4 py-2 rounded">Enter Console</button>
        </div>
      )}
      {step === "console" && (
        <ProfileStep userId={userId} onComplete={() => {}} /> 
        // Reusing ProfileStep as the console for now since it's just a chat
      )}
    </Layout>
  );
};
