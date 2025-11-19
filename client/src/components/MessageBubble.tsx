import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { Fragment, memo, useMemo } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
};

const LABEL_REGEX = /\[(profile|router|biz|fund|vehicle|mentor|research|pdf)\]/gi;

const LABEL_CLASS_MAP: Record<string, string> = {
  profile: "text-green-300",
  router: "text-yellow-300",
  biz: "text-cyan-200",
  fund: "text-pink-300",
  vehicle: "text-blue-300",
  mentor: "text-white",
  synth: "text-white",
  research: "text-sky-300",
  pdf: "text-cyan-300",
};

const ROUTER_INFO_PREFIXES = ["Router decision:", "Reason:", "Router follow-up:", "Router check:"];

const colorizeLabels = (text: string) => {
  const fragments: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  LABEL_REGEX.lastIndex = 0;
  while ((match = LABEL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragments.push(text.slice(lastIndex, match.index));
    }

    const normalized = match[1].toLowerCase();
    fragments.push(
      <span key={`${match.index}-${match[0]}`} className={cn("font-semibold", LABEL_CLASS_MAP[normalized] ?? "text-amber-300")}>
        {match[0]}
      </span>
    );

    lastIndex = LABEL_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    fragments.push(text.slice(lastIndex));
  }

  return fragments;
};

const renderConsoleText = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    const trimmed = line.trimStart();
    const isRouterMeta = ROUTER_INFO_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
    const isCodeFence = trimmed.startsWith("```");
    const lineClass = cn(
      isRouterMeta && "text-orange-300",
      isCodeFence && "text-amber-200",
      !isRouterMeta && !isCodeFence && "text-white/90"
    );

    const content = colorizeLabels(line);

    return (
      <Fragment key={`${line}-${idx}`}>
        <span className={lineClass}>{content}</span>
        {idx < lines.length - 1 && <br />}
      </Fragment>
    );
  });
};

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  const content = useMemo(() => {
    if (isUser) {
      return message.content;
    }
    return renderConsoleText(message.content || "");
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
