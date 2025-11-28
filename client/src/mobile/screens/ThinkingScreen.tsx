import React, { useEffect, useState } from "react";
import { theme } from "../theme";

interface Props {
  onComplete: () => void;
  userId: string;
  linkedInUrl: string;
  setBio: (bio: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function ThinkingScreen({ onComplete, userId, linkedInUrl, setBio }: Props) {
  const [status, setStatus] = useState("Analyzing your profile...");

  useEffect(() => {
    let cancelled = false;

    const fetchBio = async () => {
      try {
        const question = `My LinkedIn is ${linkedInUrl}. Please research my background and generate my founder bio.`;
        const url = `${API_BASE_URL}/api/stream?question=${encodeURIComponent(question)}&step=flow_profile`;

        const response = await fetch(url, {
          headers: { "x-user-id": userId },
        });

        if (!response.ok) throw new Error("Stream failed");
        if (!response.body) throw new Error("No body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            const lines = block.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.chunk) {
                    fullContent += data.chunk;
                    // Update status based on content
                    if (fullContent.includes("researching") || fullContent.includes("Searching")) {
                      setStatus("Researching your background...");
                    } else if (fullContent.includes("bio") || fullContent.includes("profile")) {
                      setStatus("Generating your bio...");
                    }
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        }

        if (!cancelled) {
          // Extract clean bio (strip JSON blocks)
          const cleanBio = fullContent
            .replace(/```(?:json)?[\s\S]*?```/gi, "")
            .replace(/\[.*?\]/g, "")
            .trim();
          setBio(cleanBio || "Your founder bio is ready!");
          onComplete();
        }
      } catch (error) {
        console.error("Bio generation error:", error);
        if (!cancelled) {
          setBio("We've prepared your founder profile based on your background.");
          onComplete();
        }
      }
    };

    fetchBio();

    return () => {
      cancelled = true;
    };
  }, [userId, linkedInUrl, setBio, onComplete]);

  return (
    <div style={styles.container}>
      {/* Pulsing Ring */}
      <div style={styles.ringContainer}>
        <div style={styles.ring} />
        <div style={styles.ringInner} />
      </div>

      {/* Bouncing Dots */}
      <div style={styles.dotsRow}>
        <span style={{ ...styles.dot, animationDelay: "0s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
      </div>

      <h1 style={styles.title}>{status}</h1>
      <p style={styles.subtitle}>This will only take a moment</p>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
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
  },
  ringContainer: {
    position: "relative",
    width: 100,
    height: 100,
    marginBottom: theme.spacing.lg,
  },
  ring: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `4px solid ${theme.colors.primary}`,
    opacity: 0.3,
    animation: "pulse 2s ease-in-out infinite",
  },
  ringInner: {
    position: "absolute",
    inset: 16,
    borderRadius: "50%",
    backgroundColor: theme.colors.primary,
    opacity: 0.2,
    animation: "pulse 2s ease-in-out infinite 0.3s",
  },
  dotsRow: {
    display: "flex",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: theme.colors.primary,
    animation: "bounce 1.4s ease-in-out infinite",
  },
  title: {
    margin: 0,
    fontSize: theme.fontSize.lg,
    fontWeight: 600,
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
};

