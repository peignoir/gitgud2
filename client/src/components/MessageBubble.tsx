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
          "rounded-3xl px-4 py-3 text-sm max-w-[85%] leading-relaxed shadow",
          isUser ? "bg-brand text-black rounded-br-md" : "bg-white/8 text-white rounded-bl-md",
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

