import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { CommandSheet } from "@/components/CommandSheet";
import { PdfUploadSheet } from "@/components/PdfUploadSheet";
import { Sparkles } from "lucide-react";

const App = () => {
  const { messages, sendMessage, isStreaming } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (value: string) => {
    sendMessage(value);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-surface-border bg-white px-4 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h1 className="text-xl font-bold text-ink">GitGud Mentor</h1>
          </div>
          <p className="text-xs text-ink-muted">Your YC-style AI advisor</p>
        </div>
        <div className="flex items-center gap-2">
          <CommandSheet onCommand={(cmd) => setInput(cmd + " ")} />
          <PdfUploadSheet />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                <Sparkles className="h-8 w-8 text-brand" />
              </div>
              <h2 className="text-2xl font-semibold text-ink">Ready to help</h2>
              <p className="text-sm text-ink-subtle">
                Ask me about MVPs, fundraising, VC funds, or share your startup idea. Use <span className="font-semibold">/</span> for quick commands.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      <footer className="border-t border-surface-border bg-white px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isStreaming}
        />
      </footer>
    </div>
  );
};

export default App;
