import React, { useState } from "react";
import { Layout } from "./Layout";
import { LoginScreen } from "./LoginScreen";
import { ProfileStep } from "./ProfileStep";

// We will build these incrementally
const PlaceholderStep = ({ title, onNext }: { title: string; onNext: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-4">
    <h2 className="text-2xl font-bold">{title}</h2>
    <button onClick={onNext} className="px-6 py-2 bg-white text-black rounded">
      Next Step
    </button>
  </div>
);

export const OnboardingWizard = () => {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("gitgud_userid"));
  const [step, setStep] = useState(1); // 1=Profile, 2=Ideation, 3=Sprint, 4=Result, 5=Console

  const handleLogin = (id: string) => {
    console.log("[Wizard] User logged in:", id);
    localStorage.setItem("gitgud_userid", id);
    setUserId(id);
  };

  const handleReset = async () => {
    if (!userId) return;
    if (!confirm("This will wipe your memory and reset the app. Sure?")) return;
    
    try {
      await fetch("/api/reset", {
        method: "POST",
        headers: { "x-user-id": userId }
      });
      localStorage.removeItem("gitgud_userid");
      setUserId(null);
      setStep(1);
      window.location.reload();
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  if (!userId) {
    return (
      <Layout>
        <LoginScreen onLogin={handleLogin} />
      </Layout>
    );
  }

  return (
    <Layout step={step} totalSteps={5} onReset={handleReset}>
      {step === 1 && <ProfileStep onComplete={() => setStep(2)} />}
      {step === 2 && <PlaceholderStep title="Step 2: Ideation" onNext={() => setStep(3)} />}
      {step === 3 && <PlaceholderStep title="Step 3: The 90-Min Sprint" onNext={() => setStep(4)} />}
      {step === 4 && <PlaceholderStep title="Step 4: Archetype Result" onNext={() => setStep(5)} />}
      {step === 5 && <PlaceholderStep title="Step 5: The Console" onNext={() => console.log("Done")} />}
    </Layout>
  );
};

