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
      <div className="flex max-w-[85%] flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-muted/80">
          {isUser ? "You" : "Mentor"}
        </span>
        <div
          className={cn(
            "rounded-3xl border px-5 py-4 text-[0.95rem] leading-relaxed shadow-md whitespace-pre-line",
            isUser
              ? "bg-brand text-brand-ink border-brand/30 rounded-br-xl"
              : "bg-surface-panel text-ink border-surface-border rounded-bl-xl",
            message.pending && "opacity-70"
          )}
        >
          {message.content || (message.pending ? "..." : "")}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;

