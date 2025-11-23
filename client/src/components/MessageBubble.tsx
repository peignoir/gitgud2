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
  profile: "text-brand-primary",
  router: "text-accent-yellow",
  biz: "text-accent-blue",
  fund: "text-accent-purple",
  vehicle: "text-accent-blue",
  mentor: "text-text-secondary",
  synth: "text-text-secondary",
  research: "text-accent-blue",
  pdf: "text-accent-blue"
};

const ANSI_COLOR_MAP: Record<string, string> = {
  "30": "text-text-secondary",
  "31": "text-status-danger",
  "32": "text-brand-primary",
  "33": "text-accent-yellow",
  "34": "text-accent-blue",
  "35": "text-accent-purple",
  "36": "text-brand-primary-soft",
  "37": "text-text-primary",
  "90": "text-text-muted",
  "94": "text-accent-blue",
  "96": "text-accent-blue"
};

const EXTENDED_COLOR_MAP: Record<string, string> = {
  "208": "text-accent-yellow" // Orange-ish in terminal, mapping to yellow for now
};

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

type Segment = { text: string; colorClass?: string; bold?: boolean };
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
        colorClass: currentClass,
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
        colorClass: currentClass,
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
      <div className="rounded-lg border border-border-subtle bg-bg-surface-soft text-left text-text-primary overflow-hidden my-3 shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 bg-bg-surface border-b border-border-subtle">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Founder Profile</span>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                setProfileForm(buildProfileForm(block.data));
                setProfileError(null);
              }
              setIsEditing((prev) => !prev);
            }}
            className="text-[10px] font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary transition-colors"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
        <div className={`space-y-3 px-3 transition-all duration-300 ${isEditing ? "py-4" : "py-3 max-h-60 overflow-y-auto"}`}>
          {FOUNDER_FIELD_SPECS.map((field) => {
            const val = profileForm[field.key];
            if (!isEditing && (!val || val.trim() === "" || val.trim() === "-")) return null;
            
            return (
              <div key={field.key}>
                <p className="text-[9px] uppercase tracking-wider text-text-muted mb-1">{field.label}</p>
                {isEditing ? (
                  <textarea
                    value={val ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    rows={field.multiline ? 3 : 1}
                    className="w-full rounded bg-bg-body border border-border-subtle p-2 text-xs text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                  />
                ) : (
                  <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                    {val}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {isEditing && (
          <div className="flex flex-col gap-2 border-t border-border-subtle px-3 py-3 bg-bg-surface">
            {profileError && <p className="text-xs text-status-danger">{profileError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="rounded bg-brand-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-text-inverse shadow hover:bg-brand-primary-soft disabled:opacity-60 transition-colors"
              >
                {profileSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface-soft text-left text-text-primary my-2 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-surface border-b border-border-subtle">
        <span className="text-[10px] font-mono text-text-muted">{normalizedLabel || "JSON"}</span>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[10px] font-semibold uppercase tracking-wide text-accent-blue hover:text-white transition-colors"
        >
          {expanded ? "Hide" : "View"}
        </button>
      </div>
      {fallbackPreview && !expanded && (
        <p className="px-3 py-2 text-xs text-text-secondary font-mono truncate">{fallbackPreview}</p>
      )}
      {expanded && (
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap bg-bg-body px-3 py-3 text-[10px] font-mono text-text-secondary">
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
    
    // Map legacy color labels to Tailwind classes
    let labelClass = "text-brand-primary";
    if (labelMatch) {
      const labelKey = labelMatch[1].toLowerCase();
      labelClass = LABEL_COLOR_MAP[labelKey] || "text-brand-primary";
    }
    
    const defaultClass =
      labelMatch ? undefined : (isRouterMeta ? "text-accent-yellow italic" : isCodeFence ? "text-accent-yellow font-mono" : "text-text-primary");
    
    const baseLineClass = cn("leading-relaxed", isRouterMeta && "italic opacity-80", isCodeFence && "font-mono bg-bg-surface-soft p-1 rounded block my-1");

    const segments = parseAnsiSegments(line);
    if (segments.length === 0) {
      if (labelMatch) {
        const labelText = labelMatch[0];
        const rest = stripped.slice(labelText.length);
        return (
          <Fragment key={`${line}-${idx}`}>
            <span className={cn(baseLineClass, "font-bold uppercase tracking-wider text-[10px] mr-2", labelClass)}>
              {labelText}
            </span>
            <span className={cn(baseLineClass, labelClass)}>
              {rest}
            </span>
            {idx < lines.length - 1 && <br />}
          </Fragment>
        );
      }
      return (
        <Fragment key={`${line}-${idx}`}>
          <span className={cn(baseLineClass, defaultClass)}>
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
            className={cn(baseLineClass, segment.bold && "font-bold", segment.colorClass || defaultClass)}
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
    <div className={cn("w-full py-4 border-b border-border-subtle/50 last:border-0", isUser ? "bg-bg-surface-soft/30" : "")}>
      <div className="max-w-3xl mx-auto px-4">
        <div className={cn("mb-2 text-[10px] font-bold uppercase tracking-widest", isUser ? "text-accent-blue" : "text-brand-primary")}>
          {isUser ? "You" : "GitGud Mentor"}
        </div>
        <div
          className={cn(
            "text-sm leading-7 whitespace-pre-wrap break-words font-sans",
            isUser ? "text-text-primary" : "text-text-secondary",
            message.pending && "opacity-70"
          )}
        >
          {renderedContent || (message.pending ? <span className="animate-pulse">...</span> : "")}
        </div>
        {!isUser && !showDebug && structuredBlocks.length > 0 && (
          <div className="mt-4 space-y-3">
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
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
