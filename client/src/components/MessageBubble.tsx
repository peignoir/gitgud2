import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import { Fragment, memo, useEffect, useMemo, useState } from "react";

type FounderFieldKey =
  | "founder"
  | "location"
  | "background"
  | "loves"
  | "hates"
  | "unfair_advantages"
  | "stage"
  | "motivations"
  | "strengths"
  | "gaps"
  | "working_style"
  | "goals"
  | "notes";

const FOUNDER_FIELD_SPECS: Array<{ key: FounderFieldKey; label: string; multiline?: boolean }> = [
  { key: "founder", label: "Founder" },
  { key: "location", label: "Location" },
  { key: "background", label: "Background", multiline: true },
  { key: "loves", label: "Loves", multiline: true },
  { key: "hates", label: "Hates", multiline: true },
  { key: "unfair_advantages", label: "Unfair Advantages", multiline: true },
  { key: "stage", label: "Stage", multiline: true },
  { key: "motivations", label: "Motivations", multiline: true },
  { key: "strengths", label: "Strengths", multiline: true },
  { key: "gaps", label: "Gaps", multiline: true },
  { key: "working_style", label: "Working Style", multiline: true },
  { key: "goals", label: "Goals", multiline: true },
  { key: "notes", label: "Notes", multiline: true }
];

type MessageBubbleProps = {
  message: ChatMessage;
  showDebug?: boolean;
  onProfileSave?: (fields: Partial<Record<FounderFieldKey, string>>) => Promise<void>;
};

const ROUTER_INFO_PREFIXES = ["Router decision:", "Reason:", "Router follow-up:", "Router check:"];
const JSON_FIELD_TOKENS = [
  '"founder"',
  '"location"',
  '"background"',
  '"loves"',
  '"hates"',
  '"unfair_advantages"',
  '"stage"',
  '"motivations"',
  '"strengths"',
  '"gaps"',
  '"working_style"',
  '"goals"',
  '"notes"'
];

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
type StructuredBlock = {
  label: string;
  raw: string;
  data?: Record<string, unknown>;
};

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

const StructuredJsonCard = ({
  block,
  onProfileSave
}: {
  block: StructuredBlock;
  onProfileSave?: (fields: Partial<Record<FounderFieldKey, string>>) => Promise<void>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const normalizedLabel = block.label || "JSON";
  const isFounderProfile =
    normalizedLabel === "FOUNDER_PROFILE" && block.data && typeof block.data === "object";
  const [profileForm, setProfileForm] = useState<Record<FounderFieldKey, string>>(() =>
    buildProfileForm(block.data)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (isFounderProfile) {
      setProfileForm(buildProfileForm(block.data));
    }
  }, [block.data, isFounderProfile]);

  const fallbackPreview =
    !isFounderProfile && block.raw
      ? `${block.raw.slice(0, 180).trim()}${block.raw.length > 180 ? "…" : ""}`
      : null;

  const prettyJson = block.data ? JSON.stringify(block.data, null, 2) : block.raw;

  const handleFieldChange = (key: FounderFieldKey, value: string) => {
    setProfileForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleProfileSave = async () => {
    if (!onProfileSave) {
      return;
    }
    try {
      setProfileSaving(true);
      setProfileError(null);
      await onProfileSave(profileForm);
      setIsEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Failed to save snapshot.");
    } finally {
      setProfileSaving(false);
    }
  };

  const isEffectiveEmpty = useMemo(() => {
    if (!isFounderProfile || !block.data) return false;
    const substantiveKeys = [
      "founder", "location", "background", "loves", "hates",
      "unfair_advantages", "stage", "motivations", "strengths",
      "gaps", "working_style", "goals"
    ];
    return substantiveKeys.every((key) => {
      const val = (block.data as Record<string, unknown>)[key];
      return !val || String(val).trim() === "" || String(val).trim() === "-" || String(val).trim() === "UNKNOWN";
    });
  }, [isFounderProfile, block.data]);

  if (isEffectiveEmpty) {
    return null;
  }

  if (isFounderProfile) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 text-left text-white/80 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
          <span>Founder Profile Snapshot</span>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setProfileForm(buildProfileForm(block.data));
                setProfileError(null);
              }
              setIsEditing((prev) => !prev);
            }}
            className="text-[10px] font-semibold uppercase tracking-wide text-white bg-gradient-to-r from-yellow-300 to-emerald-300 border border-yellow-200/70 rounded-full px-3 py-0.5 shadow-[0_0_12px_rgba(251,191,36,0.4)] hover:scale-105 transition-transform"
          >
            {isEditing ? "Cancel" : "Edit Snapshot"}
          </button>
        </div>
        <div className={`space-y-2 px-3 transition-all duration-300 ${isEditing ? "pb-4" : "pb-2 max-h-48 overflow-y-auto"}`}>
          {FOUNDER_FIELD_SPECS.map((field) => {
            const val = profileForm[field.key];
            if (!isEditing && (!val || val.trim() === "" || val.trim() === "-")) return null;
            
            return (
              <div key={field.key}>
                <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">{field.label}</p>
                {isEditing ? (
                  <textarea
                    value={val ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    rows={field.multiline ? 3 : 1}
                    className="w-full rounded-lg border border-white/15 bg-black/40 p-2 text-xs text-white outline-none focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300"
                  />
                ) : (
                  <p className="text-xs text-white/90 whitespace-pre-wrap leading-snug">
                    {val}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {isEditing && (
          <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-3 bg-black/20">
            {profileError && <p className="text-xs text-red-400">{profileError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setProfileForm(buildProfileForm(block.data));
                  setProfileError(null);
                }}
                className="rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300 hover:border-white/40"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="rounded-full bg-gradient-to-r from-yellow-300 to-emerald-400 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black shadow-[0_4px_18px_rgba(251,191,36,0.35)] disabled:opacity-60"
              >
                {profileSaving ? "Saving…" : "Save Snapshot"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 text-left text-white/80">
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
        <span>{normalizedLabel || "JSON payload"}</span>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300 transition hover:text-yellow-200"
        >
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>
      {fallbackPreview && !expanded && (
        <p className="px-3 pb-3 text-sm text-white/80">{fallbackPreview}</p>
      )}
      {expanded && (
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-b-xl bg-black/60 px-3 py-3 text-[11px] font-mono text-white/80">
          {prettyJson}
        </pre>
      )}
    </div>
  );
};

function buildProfileForm(data?: Record<string, unknown>): Record<FounderFieldKey, string> {
  const next = {} as Record<FounderFieldKey, string>;
  FOUNDER_FIELD_SPECS.forEach(({ key }) => {
    const raw = data && typeof data[key] === "string" ? (data[key] as string) : "";
    next[key] = raw;
  });
  return next;
}

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

const MessageBubble = memo(({ message, showDebug = false, onProfileSave }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  const { cleanedContent, structuredBlocks } = useMemo(() => {
    if (isUser) {
      return {
        cleanedContent: message.content || "",
        structuredBlocks: [] as StructuredBlock[]
      };
    }

    const rawContent = message.content || "";
    const ansiFreeContent = stripAnsi(rawContent);
    const blocks: StructuredBlock[] = [];
    const jsonBlockRegex = /```(?:json)?\s*([A-Z0-9_ -]+)?\s*([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;

    while ((match = jsonBlockRegex.exec(ansiFreeContent)) !== null) {
      const label = (match[1]?.trim().toUpperCase() ?? "JSON").replace(/\s+/g, "_");
      const raw = (match[2] ?? "").trim();
      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      blocks.push({ label, raw, data: parsed });
    }

    let workingContent = rawContent;

    if (!showDebug && blocks.length > 0) {
      workingContent = workingContent.replace(/```(?:json)?[\s\S]*?```/gi, "");
      workingContent = workingContent.replace(/\{[^}]*"founder"[^}]*\}[^}]*\}/gi, "");
    }

    if (!showDebug) {
      const lines = workingContent.split("\n");
      const filteredLines = lines.filter((line) => {
        const stripped = stripAnsi(line).trim();
        if (!stripped) return false;
        const lower = stripped.toLowerCase();
        const isRouterMeta = ROUTER_INFO_PREFIXES.some((prefix) =>
          lower.startsWith(prefix.toLowerCase())
        );
        if (isRouterMeta) return false;
        if (lower.includes("thinking...") || /\[.*\]\s*thinking/.test(lower)) return false;
        if (lower.includes("[profile]") || lower.includes("[research]") || lower.includes("[router]"))
          return false;
        if (stripped.includes("===")) return false;
        if (/^[{}\[\],]+$/.test(stripped)) return false;
        if (
          lower.includes("founder_profile") ||
          lower.includes("ideation_results") ||
          lower.includes("sprint_plan") ||
          lower.includes("vibecelerator_status") ||
          JSON_FIELD_TOKENS.some((token) => lower.includes(token))
        ) {
          return false;
        }
        return true;
      });

      workingContent = filteredLines.join("\n").trim();
    }

    return {
      cleanedContent: workingContent,
      structuredBlocks: blocks
    };
  }, [isUser, message.content, showDebug]);

  const renderedContent = useMemo(() => {
    if (isUser) {
      return cleanedContent;
    }
    return renderConsoleText(cleanedContent);
  }, [cleanedContent, isUser]);

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
        {renderedContent || (message.pending ? <span className="animate-pulse">...</span> : "")}
      </div>
      {!isUser && !showDebug && structuredBlocks.length > 0 && (
        <div className="mt-2 space-y-2">
          {structuredBlocks.map((block, idx) => (
            <StructuredJsonCard
              key={`${message.id}-json-${idx}`}
              block={block}
              onProfileSave={onProfileSave}
            />
          ))}
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
