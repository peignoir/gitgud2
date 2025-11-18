import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { memo } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl border px-5 py-4 text-sm leading-relaxed shadow-glow backdrop-blur-sm whitespace-pre-line",
          isUser
            ? "bg-brand text-slate-900 border-brand/30 rounded-br-xl"
            : "bg-white text-slate-900 border-black/5 rounded-bl-xl",
          message.pending && "opacity-70"
        )}
      >
        {message.content || (message.pending ? "..." : "")}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;

