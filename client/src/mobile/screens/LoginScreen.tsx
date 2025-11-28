import React from "react";
import { theme } from "../theme";

interface Props {
  email: string;
  setEmail: (email: string) => void;
}

export default function LoginScreen({ email, setEmail }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome</h1>
        <p style={styles.subtitle}>Enter your email to get started</p>

        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    boxShadow: theme.shadow.medium,
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: theme.fontSize.xxl,
    fontWeight: 700,
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  input: {
    width: "100%",
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    outline: "none",
    boxSizing: "border-box",
  },
};

