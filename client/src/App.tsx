import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { CommandSheet } from "@/components/CommandSheet";
import { PdfUploadSheet } from "@/components/PdfUploadSheet";

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
    <div className="flex h-dvh flex-col bg-[#0e111b] text-white font-mono">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#1a1f29] px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">GitGud Mentor</div>
          <div className="text-sm text-white/80">YC-style AI workflow</div>
        </div>
        <div className="flex items-center gap-2">
          <CommandSheet onCommand={(cmd) => setInput(cmd + " ")} />
          <PdfUploadSheet />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center space-y-3">
              <div className="text-yellow-300 text-lg font-bold">YC Mentor Console</div>
              <p className="text-sm text-white/70 font-mono">
                Ask about MVPs, fundraising, VC funds, or share your startup idea.
              </p>
              <p className="text-xs text-white/50">Use / for commands • + for PDF upload</p>
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

      <footer className="border-t border-white/10 bg-[#1a1f29] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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
