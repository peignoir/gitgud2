import type { ChatMessage } from "@/hooks/useChat";
import { memo } from "react";

/** Strip ANSI escape sequences so raw codes don't leak into the UI */
const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

/** Check if text contains research status messages */
const isStatusMessage = (text: string) => {
  return text.includes('[Searching]') || text.includes('[Found]') || text.includes('[Researching]');
};

type MessageBubbleProps = {
  message: ChatMessage;
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const raw = message.content ?? "";
  const body = stripAnsi(raw).trim();
  const displayText = body || (message.pending ? "…" : "");
  const hasStatus = !isUser && isStatusMessage(body);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[88%] rounded-[var(--radius-md)] px-[var(--space-lg)] py-[var(--space-md)] text-[15px] leading-relaxed transition-all"
        style={{
          backgroundColor: isUser 
            ? 'var(--color-accent-soft)' 
            : 'var(--color-bg-elevated)',
          border: `1px solid ${isUser ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
          borderRadius: isUser 
            ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)' 
            : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px'
        }}
      >
        {/* Label */}
        <p 
          className="text-[11px] uppercase tracking-[0.15em] font-medium mb-[var(--space-xs)]"
          style={{ color: isUser ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        >
          {isUser ? "You" : "Agent"}
        </p>
        
        {/* Content */}
        <div 
          className={`whitespace-pre-line ${message.pending ? "opacity-60" : ""}`}
          style={{ color: 'var(--color-text)' }}
        >
          {hasStatus ? (
            // Render status messages with special styling
            displayText.split('\n').map((line, i) => {
              if (line.includes('[Searching]') || line.includes('[Researching]')) {
                return (
                  <p 
                    key={i} 
                    className="text-[13px] py-1"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    🔍 {line.replace(/\[(Searching|Researching)\]\s*/g, '')}
                  </p>
                );
              }
              if (line.includes('[Found]')) {
                return (
                  <p 
                    key={i} 
                    className="text-[13px] py-1"
                    style={{ color: 'var(--status-success)' }}
                  >
                    ✓ {line.replace(/\[Found\]\s*/g, '')}
                  </p>
                );
              }
              return <p key={i}>{line}</p>;
            })
          ) : (
            displayText || " "
          )}
        </div>
        
        {/* Pending indicator */}
        {message.pending && (
          <div 
            className="flex items-center gap-1 mt-[var(--space-sm)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)', animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
