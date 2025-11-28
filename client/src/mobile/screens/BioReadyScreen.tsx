import React from "react";
import { theme } from "../theme";

interface Props {
  email: string;
  linkedInUrl: string;
  bio: string;
  setBio: (bio: string) => void;
}

export default function BioReadyScreen({ email, bio }: Props) {
  // Generate placeholder if empty
  const displayBio = bio || `Based on your profile, you're a founder with a strong background. We're excited to help you build something great!`;

  return (
    <div style={styles.container}>
      {/* Success Icon */}
      <div style={styles.iconCircle}>
        <span style={styles.checkmark}>✓</span>
      </div>

      <h1 style={styles.title}>Your bio is ready</h1>

      {/* Bio Card */}
      <div style={styles.card}>
        <p style={styles.bioText}>{displayBio}</p>
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
    backgroundColor: theme.colors.success,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  checkmark: {
    color: "#fff",
    fontSize: 32,
    fontWeight: 700,
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
    maxHeight: 300,
    overflowY: "auto",
  },
  bioText: {
    margin: 0,
    fontSize: theme.fontSize.md,
    lineHeight: 1.6,
    color: theme.colors.text,
    whiteSpace: "pre-wrap",
  },
};

