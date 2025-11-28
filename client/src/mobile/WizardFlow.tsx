import React, { useState, useCallback, useEffect } from "react";
import { theme } from "./theme";

// Screen imports
import LoginScreen from "./screens/LoginScreen";
import UploadScreen from "./screens/UploadScreen";
import ThinkingScreen from "./screens/ThinkingScreen";
import BioReadyScreen from "./screens/BioReadyScreen";
import IdeationScreen from "./screens/IdeationScreen";
import IdeaReadyScreen from "./screens/IdeaReadyScreen";
import ChallengeScreen from "./screens/ChallengeScreen";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STEP_COUNT = 7;

export function WizardFlow() {
  // ─── Wizard State ───────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [bio, setBio] = useState("");
  const [idea, setIdea] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Persist userId for backend alignment
  useEffect(() => {
    const stored = localStorage.getItem("ncacc_userid");
    if (stored) setEmail(stored);
  }, []);

  useEffect(() => {
    if (email) localStorage.setItem("ncacc_userid", email);
  }, [email]);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Login
        return email.includes("@") && email.length > 3;
      case 1: // Upload
        return linkedInUrl.trim().length > 0;
      default:
        return true;
    }
  }, [currentStep, email, linkedInUrl]);

  // ─── Render Screen ──────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return <LoginScreen email={email} setEmail={setEmail} />;
      case 1:
        return (
          <UploadScreen
            videoFileName={videoFileName}
            setVideoFileName={setVideoFileName}
            linkedInUrl={linkedInUrl}
            setLinkedInUrl={setLinkedInUrl}
          />
        );
      case 2:
        return <ThinkingScreen onComplete={goNext} userId={email} linkedInUrl={linkedInUrl} setBio={setBio} />;
      case 3:
        return (
          <BioReadyScreen
            email={email}
            linkedInUrl={linkedInUrl}
            bio={bio}
            setBio={setBio}
          />
        );
      case 4:
        return (
          <IdeationScreen
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            setIdea={setIdea}
            userId={email}
          />
        );
      case 5:
        return <IdeaReadyScreen idea={idea} />;
      case 6:
        return <ChallengeScreen userId={email} />;
      default:
        return null;
    }
  };

  // ─── Progress Dots ──────────────────────────────────────────────────────────
  const ProgressDots = () => (
    <div style={styles.dotsContainer}>
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.dot,
            backgroundColor:
              i === currentStep
                ? theme.colors.primary
                : i < currentStep
                ? theme.colors.success
                : theme.colors.border,
          }}
        />
      ))}
    </div>
  );

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Progress */}
      <ProgressDots />

      {/* Screen Content */}
      <div style={styles.content}>{renderScreen()}</div>

      {/* Navigation Buttons */}
      <div style={styles.navRow}>
        {currentStep > 0 && currentStep !== 2 && (
          <button style={styles.backBtn} onClick={goBack}>
            Back
          </button>
        )}
        {currentStep < STEP_COUNT - 1 && currentStep !== 2 && (
          <button
            style={{
              ...styles.nextBtn,
              backgroundColor: canProceed()
                ? theme.colors.primary
                : theme.colors.primaryDisabled,
              cursor: canProceed() ? "pointer" : "not-allowed",
            }}
            onClick={goNext}
            disabled={!canProceed()}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
    backgroundColor: theme.colors.background,
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
  },
  dotsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "background-color 0.2s",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  backBtn: {
    flex: 1,
    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: 500,
    cursor: "pointer",
  },
  nextBtn: {
    flex: 1,
    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
    borderRadius: theme.borderRadius.full,
    border: "none",
    color: "#fff",
    fontSize: theme.fontSize.md,
    fontWeight: 600,
  },
};

