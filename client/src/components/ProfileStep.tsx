import React, { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

interface ProfileStepProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ userId, onComplete }) => {
  // We use the chat hook but with a specific seed message for the Profiler
  const { messages, isStreaming, sendMessage } = useChat(userId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage("Introduce yourself and start the interview. I am ready to build my founder profile.");
    }
  }, [messages.length, sendMessage]);

  const handleSend = async () => {
    if (!inputRef.current?.value.trim() || isStreaming) return;
    const text = inputRef.current.value;
    inputRef.current.value = "";
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-[#0e111b] border-t border-white/10">
        <div className="flex gap-2 mb-2">
           <button 
             onClick={onComplete}
             className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-white transition-colors ml-auto"
           >
             [Debug: Skip to Next Step]
           </button>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2 border border-white/10 focus-within:border-yellow-400/50 transition-colors">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <input
            ref={inputRef}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="Type your answer..."
            className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none min-w-0"
            autoComplete="off"
            style={{ WebkitTextFillColor: "#fff" }} // Force white text on iOS
          />
          <button 
            onClick={handleSend}
            disabled={isStreaming}
            className="text-yellow-400 font-bold disabled:opacity-50"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};
