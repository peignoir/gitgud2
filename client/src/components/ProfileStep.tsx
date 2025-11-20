import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

interface ProfileStepProps {
  userId: string;
  onComplete: () => void;
  flowId?: string;
  overrideSeed?: string;
  placeholder?: string;
  vibe?: {
    badge: string;
    description: string;
    accentClass?: string;
    panelClassName?: string;
  };
}

const DEFAULT_SEED =
  "Introduce yourself and start the interview. I am ready to build my founder profile.";

const DEFAULT_VIBE = {
  badge: "AGENT ONLINE",
  description: "Fast, terse YC-style coaching.",
  accentClass: "text-yellow-300",
  panelClassName: "bg-[#0e111b]"
};

export const ProfileStep: React.FC<ProfileStepProps> = ({
  userId,
  onComplete,
  flowId,
  overrideSeed,
  placeholder = "Type your answer...",
  vibe = DEFAULT_VIBE
}) => {
  const mergedVibe = { ...DEFAULT_VIBE, ...vibe };
  const { messages, isStreaming, sendMessage } = useChat(userId, flowId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [showDebug, setShowDebug] = useState(false); // Always start with debug hidden

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting if empty
  useEffect(() => {
    if (messages.length === 0 && !seedRef.current) {
      seedRef.current = true;
      sendMessage(overrideSeed || DEFAULT_SEED);
    }
  }, [messages.length, sendMessage, overrideSeed]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    
    // Handle commands
    if (text.startsWith('/')) {
      if (text === '/show' || text === '/debug') {
        setShowDebug(!showDebug);
        setDraft("");
        return;
      }
      if (text === '/hide') {
        setShowDebug(false);
        setDraft("");
        return;
      }
    }
    
    setDraft("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Debug: Check if profile is "complete" by looking for a signal in the messages
  // In a real app, the backend would send a specific event, but for now we can adds a "manual" next button
  // or look for keywords. We'll add a manual "I'm done" button for this MVP phase.
  return (
    <div className={`flex flex-col h-full ${mergedVibe.panelClassName}`}>
      <div className="px-4 py-3 border-b border-white/5 bg-white/5/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className={`text-[10px] font-semibold tracking-[0.3em] uppercase ${mergedVibe.accentClass}`}>
              {mergedVibe.badge}
            </span>
            <p className="text-sm text-gray-300 mt-1 max-w-xl">{mergedVibe.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`text-[10px] uppercase tracking-wider transition-colors ${
                showDebug ? "text-yellow-400" : "text-gray-500 hover:text-white"
              }`}
            >
              {showDebug ? "[Hide Debug]" : "[Show Debug]"}
            </button>
            <button
              onClick={onComplete}
              className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-white transition-colors"
            >
              [Skip]
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showDebug={showDebug} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-black/30 backdrop-blur-sm border-t border-white/5">
        {showDebug && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-2">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-yellow-300 animate-pulse" : "bg-emerald-300"}`} />
            {isStreaming ? "Agent drafting…" : "Ready"}
          </div>
        )}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2 border border-white/10 focus-within:border-yellow-400/50 transition-colors">
          <input
            onKeyDown={handleKeyDown}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type="text"
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none min-w-0"
            autoComplete="off"
            style={{ WebkitTextFillColor: "#fff" }} // Force white text on iOS
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`font-bold transition-colors ${
              !draft.trim() ? "text-gray-600 cursor-not-allowed" : "text-yellow-400 hover:text-yellow-300"
            }`}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};
