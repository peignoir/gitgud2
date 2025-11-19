import { ChangeEvent, useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { label: "/help", desc: "Show available commands" },
  { label: "/quiet", desc: "Toggle verbose mode" }
];

const App = () => {
  const { messages, sendMessage, isStreaming } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [commandSheetOpen, setCommandSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleSubmit = async () => {
    const val = input.trim();
    if (!val || isStreaming) return;
    sendMessage(val);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCommand = (cmd: string) => {
    setInput((prev) => `${cmd} ${prev}`.trim());
    setCommandSheetOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/pdf", {
        method: "POST",
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      setUploadStatus(data.summary ? "PDF indexed & summarized" : "PDF indexed");
      // Inject a system message or visual feedback
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setUploadStatus("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, uploadStatus]);

  return (
    <div className="flex h-dvh flex-col bg-[#0e111b] text-white font-mono overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between border-b border-white/10 bg-[#1a1f29] px-4 py-3 safe-top">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400/80 font-bold">GitGud.vc</div>
          <div className="text-xs text-white/60">YC Mentor Console</div>
        </div>
        <div className="flex items-center gap-2">
           {/* Status Indicator */}
           <div className={cn("h-2 w-2 rounded-full", isStreaming ? "bg-amber-400 animate-pulse" : "bg-green-500/50")} />
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && !uploadStatus ? (
          <div className="flex h-full flex-col items-center justify-center opacity-40 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
              🚀
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">Ready to build</p>
              <p className="text-xs">Ask about fundraising, growth, or vehicles.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {uploadStatus && (
               <div className="py-2">
                 <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 opacity-60 mb-1">System</div>
                 <div className="font-mono text-sm text-amber-200/80 italic">{uploadStatus}</div>
               </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </main>

      {/* Footer / Input Area */}
      <footer className="shrink-0 bg-[#1a1f29] border-t border-white/10 p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex gap-3 items-stretch h-[52px]">
          {/* Input Pill */}
          <div className="flex-1 bg-[#ceb06d] rounded-xl flex items-center px-3 shadow-lg shadow-amber-900/20 transition-transform active:scale-[0.99]">
            <input
              className="flex-1 bg-transparent text-black placeholder-black/50 text-base font-medium outline-none min-w-0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? "Thinking..." : "Ask anything..."}
              disabled={isStreaming}
              autoComplete="off"
            />
            <button 
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming}
              className="ml-2 text-[10px] font-bold uppercase tracking-wider text-black/70 disabled:opacity-30"
            >
              Send
            </button>
          </div>

          {/* Command Button */}
          <button
            onClick={() => setCommandSheetOpen(true)}
            className="w-[52px] flex items-center justify-center bg-[#282d37] border border-white/10 rounded-xl text-amber-400 hover:bg-[#323846] active:scale-95 transition-all"
          >
            <span className="text-lg font-bold">/</span>
          </button>

          {/* PDF Upload Button */}
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-[52px] flex items-center justify-center bg-[#282d37] border border-white/10 rounded-xl text-amber-400 hover:bg-[#323846] active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>
      </footer>

      {/* Command Overlay */}
      {commandSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={() => setCommandSheetOpen(false)}>
          <div className="w-full bg-[#1f232b] border-t border-white/10 rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Commands</span>
              <button onClick={() => setCommandSheetOpen(false)} className="text-xs text-white/60 p-2">Close</button>
            </div>
            <div className="space-y-2">
              {COMMANDS.map(cmd => (
                <button
                  key={cmd.label}
                  onClick={() => handleCommand(cmd.label)}
                  className="w-full bg-[#282d37] hover:bg-[#323846] border border-white/5 rounded-xl p-4 flex items-center gap-3 transition-colors text-left"
                >
                  <span className="font-bold text-amber-400">{cmd.label}</span>
                  <span className="text-sm text-white/60">{cmd.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default App;
