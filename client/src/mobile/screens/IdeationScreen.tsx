import React, { useState, useRef, useEffect, useCallback } from "react";
import { theme } from "../theme";
import type { ChatMessage } from "../WizardFlow";

interface Props {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIdea: (idea: string) => void;
  userId: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const SEED_MESSAGE: ChatMessage = {
  id: "seed",
  role: "assistant",
  content: "Let's brainstorm some startup ideas based on your background. What problems are you most passionate about solving?",
};

export default function IdeationScreen({
  chatMessages,
  setChatMessages,
  setIdea,
  userId,
}: Props) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed the conversation
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([SEED_MESSAGE]);
    }
  }, [chatMessages.length, setChatMessages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setChatMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInput("");
    setIsStreaming(true);

    try {
      const question = input.trim();
      const url = `${API_BASE_URL}/api/stream?question=${encodeURIComponent(question)}&step=flow_ideation`;

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
                  setChatMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last.role === "assistant") {
                      next[next.length - 1] = { ...last, content: fullContent };
                    }
                    return next;
                  });
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }

      // Extract idea summary (strip JSON blocks)
      const cleanIdea = fullContent
        .replace(/```(?:json)?[\s\S]*?```/gi, "")
        .trim();
      if (cleanIdea.length > 100) {
        setIdea(cleanIdea.slice(0, 500) + "...");
      }
    } catch (error) {
      console.error("Ideation error:", error);
      setChatMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "Sorry, I had trouble connecting. Please try again.",
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, userId, setChatMessages, setIdea]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Let's brainstorm</h2>

      {/* Chat Messages */}
      <div ref={scrollRef} style={styles.chatArea}>
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.bubble,
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                msg.role === "user"
                  ? theme.colors.userBubble
                  : theme.colors.assistantBubble,
              color: msg.role === "user" ? "#fff" : theme.colors.text,
            }}
          >
            {msg.content || (
              <span style={styles.typing}>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            ...styles.sendBtn,
            opacity: input.trim() && !isStreaming ? 1 : 0.5,
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin: 0 2px;
          animation: bounce 1.4s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
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
    backgroundColor: theme.colors.background,
  },
  header: {
    margin: 0,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    fontWeight: 600,
    color: theme.colors.text,
    textAlign: "center",
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    overflowY: "auto",
  },
  bubble: {
    maxWidth: "80%",
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.fontSize.md,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  typing: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  inputRow: {
    display: "flex",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTop: `1px solid ${theme.colors.border}`,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.border}`,
    outline: "none",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    backgroundColor: theme.colors.primary,
    color: "#fff",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
  },
};

