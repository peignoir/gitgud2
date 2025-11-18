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

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([seedMessage]);
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

    const src = new EventSource(`/api/stream?question=${encodeURIComponent(question.trim())}`);
    sourceRef.current = src;

    src.addEventListener("chunk", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { chunk?: string };
      if (!data.chunk) {
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: `${last.content}${data.chunk}`, pending: true };
        return next;
      });
    });

    const finalize = () => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, pending: false };
        return next;
      });
      setIsStreaming(false);
      src.close();
      sourceRef.current = null;
    };

    src.addEventListener("done", finalize);
    src.addEventListener("error", (event) => {
      console.error("stream error", event);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Hmm, the backend had an issue. Try again in a second."
        };
        return next;
      });
      finalize();
    });
  }, []);

  const cancel = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, cancel };
}

