import React from "react";
import { theme } from "../theme";

interface Props {
  idea: string;
}

const HIGHLIGHTS = [
  { icon: "🎯", label: "Problem-Solution Fit" },
  { icon: "👥", label: "Target Audience" },
  { icon: "💰", label: "Monetization Path" },
];

export default function IdeaReadyScreen({ idea }: Props) {
  const displayIdea = idea || "Your startup idea has been captured from our brainstorming session. Review the highlights below and get ready to start building!";

  return (
    <div style={styles.container}>
      {/* Icon */}
      <div style={styles.iconCircle}>
        <span style={styles.icon}>💡</span>
      </div>

      <h1 style={styles.title}>Your idea is ready</h1>

      {/* Idea Card */}
      <div style={styles.card}>
        <p style={styles.ideaText}>{displayIdea}</p>
      </div>

      {/* Key Highlights */}
      <h3 style={styles.highlightsTitle}>Key Highlights</h3>
      <div style={styles.highlightsRow}>
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} style={styles.highlightChip}>
            <span style={styles.highlightIcon}>{h.icon}</span>
            <span style={styles.highlightLabel}>{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#FFF3CD",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    margin: 0,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.xl,
    fontWeight: 700,
    color: theme.colors.text,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    boxShadow: theme.shadow.medium,
    maxHeight: 200,
    overflowY: "auto",
    marginBottom: theme.spacing.lg,
  },
  ideaText: {
    margin: 0,
    fontSize: theme.fontSize.md,
    lineHeight: 1.6,
    color: theme.colors.text,
    whiteSpace: "pre-wrap",
  },
  highlightsTitle: {
    margin: 0,
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.md,
    fontWeight: 600,
    color: theme.colors.text,
  },
  highlightsRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  highlightChip: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    boxShadow: theme.shadow.small,
  },
  highlightIcon: {
    fontSize: 16,
  },
  highlightLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
};

