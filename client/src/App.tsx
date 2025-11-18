import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { CommandSheet } from "@/components/CommandSheet";
import { PdfUploadSheet } from "@/components/PdfUploadSheet";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const App = () => {
  const { messages, sendMessage, isStreaming, cancel } = useChat();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (value: string) => {
    sendMessage(value);
    setInput("");
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-dvh text-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pb-6">
        <header className="pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-5">
          <div className="rounded-3xl border border-white/10 bg-surface-card px-5 py-4 shadow-glow backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">GitGud Mentor</p>
                <h1 className="text-2xl font-semibold text-white">YC-style advice for GPs</h1>
                <p className="text-sm text-white/70">Ask about fundraising, vehicles, or YC-style execution.</p>
              </div>
              <div className="flex items-center gap-2">
                <CommandSheet onCommand={(command) => setInput((prev) => `${command} ${prev}`.trim())} />
                <PdfUploadSheet />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 pb-4">
          <div
            ref={listRef}
            className="h-full overflow-y-auto space-y-4 rounded-3xl border border-white/10 bg-surface-raised px-4 py-6 shadow-glow backdrop-blur"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isStreaming && (
              <Button variant="ghost" size="sm" className="mx-auto text-xs text-white/70" onClick={cancel}>
                <RefreshCw className="mr-2 h-4 w-4" /> Stop response
              </Button>
            )}
          </div>
        </main>

        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  );
};

export default App;

