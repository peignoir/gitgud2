import { useCallback, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

const seedMessage: ChatMessage = {
  id: "seed",
  role: "assistant",
  content: "Hey founder! Drop a question about fundraising, vehicles, or YC style execution."
};

// In production, this needs to point to your deployed API server
// For local testing, ensure the API server is running on port 4000
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Show a warning if API URL is not configured in production
if (!API_BASE_URL && import.meta.env.PROD) {
  console.warn("API_URL not configured. The app needs an API server running. Please set VITE_API_URL environment variable.");
}

export function useChat(userId?: string, stepId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) {
      return;
    }
    sourceRef.current?.close();
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question.trim() };
    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true
    };
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);

    const effectiveUserId = userId || localStorage.getItem("gitgud_userid") || "default_user";
    const flowParam = stepId ? `&step=${encodeURIComponent(stepId)}` : "";
    const url = `${API_BASE_URL}/api/stream?question=${encodeURIComponent(question.trim())}${flowParam}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "x-user-id": effectiveUserId
        }
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Stream failed");
      }

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                if (data.chunk) {
                  setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last.role === "assistant" && last.pending) {
                       next[next.length - 1] = { ...last, content: last.content + data.chunk };
                    }
                    return next;
                  });
                }
              } catch (e) {
                // ignore parse errors
              }
            }
          }
        }
      }
      
      // Finalize
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, pending: false };
        return next;
      });

    } catch (error: any) {
      console.error("Stream error:", error);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        let errorMessage = "Connection error. Please try again.";
        
        // Provide more specific error messages
        if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
          errorMessage = "⚠️ Cannot connect to the API server. To use this app:\n\n1. Run the backend: npm run api\n2. Make sure it's running on port 4000\n3. For production, set VITE_API_URL to your API server URL";
        } else if (!API_BASE_URL && import.meta.env.PROD) {
          errorMessage = "⚠️ API URL not configured. Please set VITE_API_URL environment variable to your API server URL.";
        }
        
        next[next.length - 1] = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorMessage
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [userId, stepId]);

  const cancel = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setIsStreaming(false);
  }, []);

  return { messages, setMessages, isStreaming, sendMessage, cancel };
}
