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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} message-enter py-2`}>
      <div
        ref={bubbleRef}
        className={`max-w-[80%] px-4 py-3 text-[15px] leading-relaxed transition-all rounded-2xl ${
          isUser
            ? "bg-[#0A84FF] text-white rounded-br-sm"
            : "bg-[#F2F2F7] text-gray-900 rounded-bl-sm"
        }`}
      >
        {/* Content */}
        <div className="whitespace-pre-line">
          {message.pending && !displayText ? (
            // Typing indicator
            <div className="flex items-center gap-1.5 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : hasStatus ? (
            // Collapsible status logic could go here, for now simple line
            <p className="text-xs text-gray-400 italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Thinking...
            </p>
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
