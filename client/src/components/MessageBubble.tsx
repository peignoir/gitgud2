import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { memo } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
};

// Strip ANSI escape codes from terminal output
const stripAnsi = (text: string) => {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const cleanContent = stripAnsi(message.content || "");

  return (
    <div className="w-full py-2">
      <div className={cn("mb-1 text-[10px] font-mono uppercase tracking-wider opacity-60", isUser ? "text-cyan-400" : "text-amber-400")}>
        {isUser ? "Founder" : "GitGud Mentor"}
      </div>
      <div
        className={cn(
          "font-mono text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser ? "text-cyan-100" : "text-white/90",
          message.pending && "opacity-70"
        )}
      >
        {cleanContent || (message.pending ? <span className="animate-pulse">...</span> : "")}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
