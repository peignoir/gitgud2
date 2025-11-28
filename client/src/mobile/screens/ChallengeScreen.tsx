import React from "react";
import { theme } from "../theme";

interface Props {
  userId: string;
}

const FEATURES = [
  { icon: "⏱", title: "90 Minutes", desc: "Focused sprint timer" },
  { icon: "🎯", title: "Milestones", desc: "Clear checkpoints" },
  { icon: "🤖", title: "AI Guidance", desc: "Real-time coaching" },
];

export default function ChallengeScreen({ userId }: Props) {
  const handleStart = () => {
    // TODO: Navigate to sprint flow
    console.log("Starting challenge for user:", userId);
    alert("Challenge starting! (Sprint flow coming soon)");
  };

  return (
    <div style={styles.container}>
      {/* Hero Icon */}
      <div style={styles.heroIcon}>🚀</div>

      <h1 style={styles.title}>Let's start the 90 min challenge</h1>
      <p style={styles.description}>
        You'll ship something real in the next 90 minutes. Our AI will guide you through each milestone, keeping you focused and accountable.
      </p>

      {/* Feature Cards */}
      <div style={styles.featuresRow}>
        {FEATURES.map((f) => (
          <div key={f.title} style={styles.featureCard}>
            <span style={styles.featureIcon}>{f.icon}</span>
            <span style={styles.featureTitle}>{f.title}</span>
            <span style={styles.featureDesc}>{f.desc}</span>
          </div>
        ))}
      </div>

      {/* Start Button */}
      <button style={styles.startBtn} onClick={handleStart}>
        Start
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    textAlign: "center",
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  title: {
    margin: 0,
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.xl,
    fontWeight: 700,
    color: theme.colors.text,
  },
  description: {
    margin: 0,
    marginBottom: theme.spacing.xl,
    fontSize: theme.fontSize.md,
    lineHeight: 1.6,
    color: theme.colors.textSecondary,
    maxWidth: 320,
  },
  featuresRow: {
    display: "flex",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  featureCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadow.small,
    width: 100,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.xs,
  },
  featureTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: 600,
    color: theme.colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  startBtn: {
    padding: `${theme.spacing.md}px ${theme.spacing.xxl}px`,
    fontSize: theme.fontSize.lg,
    fontWeight: 600,
    color: "#fff",
    backgroundColor: theme.colors.primary,
    border: "none",
    borderRadius: theme.borderRadius.full,
    cursor: "pointer",
    boxShadow: theme.shadow.medium,
  },
};

