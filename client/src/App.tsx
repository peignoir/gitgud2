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
    <div className="min-h-dvh bg-surface text-white flex flex-col">
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">GitGud Mentor</p>
            <h1 className="text-xl font-semibold">YC-style advice for GPs</h1>
          </div>
          <div className="flex items-center gap-2">
            <CommandSheet onCommand={(command) => setInput((prev) => `${command} ${prev}`.trim())} />
            <PdfUploadSheet />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div ref={listRef} className="h-full overflow-y-auto px-4 pb-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && (
            <Button variant="ghost" size="sm" className="mx-auto text-xs text-white/60" onClick={cancel}>
              <RefreshCw className="h-4 w-4 mr-2" /> Stop response
            </Button>
          )}
        </div>
      </main>

      <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isStreaming} />
    </div>
  );
};

export default App;

