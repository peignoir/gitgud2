import type { ChatMessage } from "@/hooks/useChat";
import type { CSSProperties } from "react";
import { memo } from "react";

/** Strip ANSI escape sequences so raw codes don't leak into the UI */
const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

const agentStripeStyle: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 12px, rgba(255,255,255,0.01) 12px, rgba(255,255,255,0.01) 24px)"
};

type MessageBubbleProps = {
  message: ChatMessage;
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const raw = message.content ?? "";
  const body = stripAnsi(raw).trim();
  const displayText = body || (message.pending ? "…" : "");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-relaxed transition ${
          isUser
            ? "border-brand-primary/40 bg-brand-primary/10 text-text-primary"
            : "border-white/15 bg-white/5 text-text-primary"
        }`}
        style={isUser ? undefined : agentStripeStyle}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted">
          {isUser ? "You" : "Agent"}
        </p>
        <p className={`mt-2 whitespace-pre-line ${message.pending ? "opacity-70" : ""}`}>
          {displayText || " "}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
