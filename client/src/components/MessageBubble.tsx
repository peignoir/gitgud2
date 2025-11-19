import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { memo, useMemo } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
};

// Simple ANSI parser for the specific colors used in this app
const parseAnsi = (text: string) => {
  // Split by ANSI escape codes
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  const result: React.ReactNode[] = [];
  let currentColor = "text-white/90";
  let isBold = false;

  // Map ANSI codes to Tailwind classes
  const colorMap: Record<string, string> = {
    "30": "text-gray-500",
    "31": "text-red-400",
    "32": "text-green-400", // Profile
    "33": "text-yellow-300", // Router
    "34": "text-blue-400", // Vehicle
    "35": "text-pink-400", // Fund
    "36": "text-cyan-400", // Biz
    "37": "text-gray-300",
    "90": "text-gray-500",
    "0": "text-white/90", // Reset
  };

  parts.forEach((part, i) => {
    if (part.startsWith("\x1b[")) {
      // Parse code
      const codes = part.match(/\d+/g);
      if (codes) {
        codes.forEach((code) => {
          if (code === "0") {
            currentColor = "text-white/90";
            isBold = false;
          } else if (code === "1") {
            isBold = true;
          } else if (colorMap[code]) {
            currentColor = colorMap[code];
          }
        });
      }
    } else if (part) {
      result.push(
        <span key={i} className={cn(currentColor, isBold && "font-bold")}>
          {part}
        </span>
      );
    }
  });

  return result;
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  
  const content = useMemo(() => {
    if (isUser) return message.content;
    return parseAnsi(message.content || "");
  }, [message.content, isUser]);

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
        {content || (message.pending ? <span className="animate-pulse">...</span> : "")}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
