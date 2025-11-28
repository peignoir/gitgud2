import React, { useRef } from "react";
import { theme } from "../theme";

interface Props {
  videoFileName: string | null;
  setVideoFileName: (name: string | null) => void;
  linkedInUrl: string;
  setLinkedInUrl: (url: string) => void;
}

export default function UploadScreen({
  videoFileName,
  setVideoFileName,
  linkedInUrl,
  setLinkedInUrl,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectVideo = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Tell us about you</h1>

        {/* Video Upload Area */}
        <div style={styles.uploadArea} onClick={handleSelectVideo}>
          <div style={styles.playIcon}>▶</div>
          <p style={styles.uploadText}>
            {videoFileName || "Select 3 min video"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* LinkedIn Input */}
        <label style={styles.label}>LinkedIn Profile</label>
        <input
          type="url"
          placeholder="https://linkedin.com/in/yourname"
          value={linkedInUrl}
          onChange={(e) => setLinkedInUrl(e.target.value)}
          style={styles.input}
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
  },
  title: {
    margin: 0,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.xl,
    fontWeight: 700,
    color: theme.colors.text,
    textAlign: "center",
  },
  uploadArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    border: `2px dashed ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    cursor: "pointer",
    marginBottom: theme.spacing.lg,
    transition: "border-color 0.2s",
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: theme.colors.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    marginBottom: theme.spacing.sm,
  },
  uploadText: {
    margin: 0,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  label: {
    display: "block",
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    fontWeight: 500,
    color: theme.colors.text,
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

