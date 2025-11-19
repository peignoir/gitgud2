import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import MessageBubble from "@/components/MessageBubble";
import { cn } from "@/lib/utils";

interface ProfileStepProps {
  onComplete: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ onComplete }) => {
  const { messages, sendMessage, isStreaming } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Auto-start the conversation
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === "seed") {
      // We override the seed behavior for this specific step
      sendMessage("Hi, I'm ready to build my profile. Who are you?");
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if the AI thinks we are done (heuristic for now, later explicit signal)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && !isStreaming) {
      // In a real implementation, the agent would emit a structured signal.
      // For now, we simulate "Complete" if the user clicks a button, or we can parse text.
      // Let's just show a "Continue" button if conversation > 5 messages.
      if (messages.length > 5) {
        setIsProfileComplete(true);
      }
    }
  }, [messages, isStreaming]);

  const handleSubmit = () => {
    const val = input.trim();
    if (!val || isStreaming) return;
    sendMessage(val);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Goal Header */}
      <div className="shrink-0 px-6 py-4 bg-white/5 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Step 1: Identity</h2>
        <p className="text-sm text-gray-400">
          I need to understand your background, superpowers, and ambition.
        </p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.slice(1).map((msg) => ( // Skip the hidden seed
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <div className="text-xs text-yellow-500/50 animate-pulse ml-2">
            [Profiler] analyzing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-white/10 bg-[#0e111b]">
        {isProfileComplete ? (
          <button
            onClick={onComplete}
            className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)]"
          >
            Profile Looks Good -> Next Step
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Type your answer..."
              disabled={isStreaming}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming}
              className="px-6 bg-white text-black font-bold rounded-xl disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

