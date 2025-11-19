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

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function useChat(userId?: string) {
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
    
    // EventSource doesn't support custom headers natively in standard browser API
    // So we pass userId as a query param for the handshake, or use a polyfill.
    // Ideally we'd use fetch + ReadableStream but to keep it simple with EventSource we use query param or a polyfill.
    // Wait, our backend checks headers["x-user-id"]. EventSource cannot send headers.
    // We must change backend to ALSO accept query param OR use fetch-based streaming.
    // For now, let's use query param since I can't easily add a large polyfill.
    // I'll update the URL to include it.
    const url = `${API_BASE_URL}/api/stream?question=${encodeURIComponent(question.trim())}`;
    
    // Actually, let's use fetch-event-source or similar if we really need headers, 
    // BUT for this specific task, I will rely on the browser's native EventSource and pass ID in query
    // and update the backend to read it from query as fallback.
    // WAIT: I can't change backend right now without another turn.
    // Let's assume we use a polyfill or I'll just use query param and hope backend has fallback.
    // Actually, I previously saw the backend code: `const userId = (req.headers["x-user-id"] as string | undefined) ?? "default_user";`
    // It ONLY reads header. This is a problem for EventSource.
    
    // FIX: I will use `fetch` and a simple stream reader instead of `EventSource` to support headers.
    // This is more robust anyway.
    
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
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.chunk) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  // Only append if it's the same message ID (simple check)
                  if (last.role === "assistant" && last.pending) {
                     next[next.length - 1] = { ...last, content: last.content + data.chunk };
                  }
                  return next;
                });
              }
            } catch (e) {
              // ignore parse errors for partial chunks
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
      setIsStreaming(false);

    } catch (error) {
      console.error("Stream error:", error);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection error. Please try again."
        };
        return next;
      });
      setIsStreaming(false);
    }
  }, [userId]);

  const cancel = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, cancel };
}

