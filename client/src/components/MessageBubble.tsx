import type { ChatMessage } from "@/hooks/useChat";
import { memo, useRef, useEffect } from "react";

/** Strip ANSI escape sequences so raw codes don't leak into the UI */
const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

/** Check if text contains research status messages */
const isStatusMessage = (text: string) => {
  return text.includes('[Searching]') || text.includes('[Found]') || text.includes('[Researching]');
};

/** Parse markdown-style formatting for better readability */
const formatContent = (text: string) => {
  // Bold: **text**
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Bullet points with proper styling
  formatted = formatted.replace(/^- /gm, '• ');
  return formatted;
};

type MessageBubbleProps = {
  message: ChatMessage;
  isNew?: boolean;
};

const MessageBubble = memo(({ message, isNew = false }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const raw = message.content ?? "";
  const body = stripAnsi(raw).trim();
  const displayText = body || (message.pending ? "" : "");
  const hasStatus = !isUser && isStatusMessage(body);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Trigger haptic feedback on new user messages (iOS)
  useEffect(() => {
    if (isNew && isUser && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [isNew, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} message-enter`}>
      <div
        ref={bubbleRef}
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
          {isUser ? "You" : "Mentor"}
        </p>
        
        {/* Content */}
        <div 
          className={`whitespace-pre-line ${message.pending && !displayText ? "min-h-[20px]" : ""}`}
          style={{ color: 'var(--color-text)' }}
        >
          {message.pending && !displayText ? (
            // Typing indicator
            <div className="flex items-center gap-1.5 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : hasStatus ? (
            // Render status messages with special styling
            displayText.split('\n').map((line, i) => {
              if (line.includes('[Searching]') || line.includes('[Researching]')) {
                return (
                  <p 
                    key={i} 
                    className="text-[13px] py-1 flex items-center gap-2"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {line.replace(/\[(Searching|Researching)\]\s*/g, '')}
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
            <span dangerouslySetInnerHTML={{ __html: formatContent(displayText) || " " }} />
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
