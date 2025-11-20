import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { Fragment, memo, useMemo } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
  showDebug?: boolean;
};

const ROUTER_INFO_PREFIXES = ["Router decision:", "Reason:", "Router follow-up:", "Router check:"];

const LABEL_REGEX = /\[(profile|router|biz|fund|vehicle|mentor|research|pdf)\]/i;

const LABEL_COLOR_MAP: Record<string, string> = {
  profile: "#86efac",
  router: "#facc15",
  biz: "#5eead4",
  fund: "#f472b6",
  vehicle: "#93c5fd",
  mentor: "#e5e7eb",
  synth: "#e5e7eb",
  research: "#7dd3fc",
  pdf: "#67e8f9"
};

const ANSI_COLOR_MAP: Record<string, string> = {
  "30": "#a1a1aa",
  "31": "#f87171",
  "32": "#4ade80",
  "33": "#facc15",
  "34": "#93c5fd",
  "35": "#f472b6",
  "36": "#5eead4",
  "37": "#f8fafc",
  "90": "#a1a1aa",
  "94": "#7dd3fc",
  "96": "#67e8f9"
};

const EXTENDED_COLOR_MAP: Record<string, string> = {
  "208": "#fb923c"
};

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

type Segment = { text: string; color?: string; bold?: boolean };

const parseAnsiSegments = (input: string): Segment[] => {
  const regex = /\x1b\[([0-9;]+)m/g;
  const segments: Segment[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let currentClass: string | undefined;
  let bold = false;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        color: currentClass,
        bold
      });
    }

    const codes = match[1].split(";");
    for (let i = 0; i < codes.length; i += 1) {
      const code = codes[i];
      if (code === "0") {
        currentClass = undefined;
        bold = false;
        continue;
      }
      if (code === "1") {
        bold = true;
        continue;
      }
      if (code === "2") {
        bold = false;
        continue;
      }
      if (code === "38" && codes[i + 1] === "5" && codes[i + 2]) {
        const extended = EXTENDED_COLOR_MAP[codes[i + 2]];
        if (extended) {
          currentClass = extended;
        }
        i += 2;
        continue;
      }
      if (ANSI_COLOR_MAP[code]) {
        currentClass = ANSI_COLOR_MAP[code];
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
      segments.push({
        text: input.slice(lastIndex),
        color: currentClass,
        bold
      });
  }

  return segments.filter((segment) => segment.text.length > 0);
};

const renderConsoleText = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    const stripped = stripAnsi(line);
    const trimmed = stripped.trimStart();
    const isRouterMeta = ROUTER_INFO_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
    const isCodeFence = trimmed.startsWith("```");
    const labelMatch = stripped.match(LABEL_REGEX);
    const labelColor = labelMatch ? LABEL_COLOR_MAP[labelMatch[1].toLowerCase()] : undefined;
    const defaultColor =
      labelColor ?? (isRouterMeta ? "#fb923c" : isCodeFence ? "#fcd34d" : "#f8fafc");
    const baseLineClass = cn(isRouterMeta && "italic", isCodeFence && "font-mono");

    const segments = parseAnsiSegments(line);
    if (segments.length === 0) {
      if (labelMatch) {
        const [, label] = labelMatch;
        const labelText = labelMatch[0];
        const rest = stripped.slice(labelText.length);
        return (
          <Fragment key={`${line}-${idx}`}>
            <span className={cn(baseLineClass, "font-semibold")} style={{ color: labelColor }}>
              {labelText}
            </span>
            <span className={baseLineClass} style={{ color: labelColor }}>
              {rest}
            </span>
            {idx < lines.length - 1 && <br />}
          </Fragment>
        );
      }
      return (
        <Fragment key={`${line}-${idx}`}>
          <span className={baseLineClass} style={{ color: defaultColor }}>
            {stripped}
          </span>
          {idx < lines.length - 1 && <br />}
        </Fragment>
      );
    }

    return (
      <Fragment key={`${line}-${idx}`}>
        {segments.map((segment, segIdx) => (
          <span
            key={`${idx}-${segIdx}`}
            className={cn(baseLineClass, segment.bold && "font-semibold")}
            style={{ color: segment.color ?? defaultColor }}
          >
            {segment.text}
          </span>
        ))}
        {idx < lines.length - 1 && <br />}
      </Fragment>
    );
  });
};

const MessageBubble = memo(({ message, showDebug = false }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  const content = useMemo(() => {
    if (isUser) {
      return message.content;
    }
    
    let messageContent = message.content || "";
    
    // Filter out debug/thinking content if showDebug is false
    if (!showDebug) {
      const lines = messageContent.split('\n');
      const filteredLines = lines.filter(line => {
        const stripped = stripAnsi(line).trim();
        
        // Hide router meta info
        const isRouterMeta = ROUTER_INFO_PREFIXES.some((prefix) => stripped.startsWith(prefix));
        if (isRouterMeta) return false;
        
        // Hide thinking patterns
        if (stripped.includes('thinking...') || stripped.includes('[research]') || 
            stripped.includes('[profile]') || stripped.match(/\[.*\]\s*thinking/i)) return false;
        
        // Hide JSON blocks (they're usually debug info)
        if (stripped.startsWith('```json') || stripped.includes('FOUNDER_PROFILE') ||
            stripped.includes('IDEATION_RESULTS') || stripped.includes('SPRINT_PLAN')) return false;
        
        return true;
      });
      
      messageContent = filteredLines.join('\n').trim();
    }
    
    return renderConsoleText(messageContent);
  }, [message.content, isUser, showDebug]);

  return (
    <div className="w-full py-2">
      <div className={cn("mb-1 text-[10px] font-mono uppercase tracking-wider opacity-60", isUser ? "text-cyan-400" : "text-yellow-300")}>
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
