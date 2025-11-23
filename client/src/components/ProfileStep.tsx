import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

type CachedProfile = {
  founder?: string;
  location?: string;
  background?: string;
  loves?: string;
  hates?: string;
  unfair_advantages?: string;
  stage?: string;
  goals?: string;
  notes?: string;
  ready?: boolean;
};

type ProfileTextField = Exclude<keyof CachedProfile, "ready">;

const PROFILE_BLOCK_REGEX = /```(?:json)?\s*FOUNDER_PROFILE\s*([\s\S]*?)```/i;
const PROFILE_TEXT_FIELDS: ReadonlyArray<ProfileTextField> = [
  "founder",
  "location",
  "background",
  "loves",
  "hates",
  "unfair_advantages",
  "stage",
  "goals",
  "notes"
];

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;
const stripAnsiCodes = (value: string) => value.replace(ANSI_REGEX, "");
const sanitizeValue = (value?: string) => {
  if (!value) return value;
  const stripped = stripAnsiCodes(value).replace(/\s+/g, " ").trim();
  if (stripped === "-" || stripped === "UNKNOWN" || stripped === "N/A") {
    return undefined;
  }
  return stripped;
};

interface ProfileStepProps {
  userId: string;
  onComplete: () => void;
  flowId?: string;
  overrideSeed?: string;
  placeholder?: string;
  vibe?: {
    badge: string;
    description: string;
    accentClass?: string;
    panelClassName?: string;
  };
}

const DEFAULT_VIBE = {
  badge: "AGENT ONLINE",
  description: "Fast, terse YC-style coaching.",
  accentClass: "text-brand-primary",
  panelClassName: "bg-bg-surface"
};

export const ProfileStep: React.FC<ProfileStepProps> = ({
  userId,
  onComplete,
  flowId,
  overrideSeed,
  placeholder = "Type your answer...",
  vibe = DEFAULT_VIBE
}) => {
  const mergedVibe = { ...DEFAULT_VIBE, ...vibe };
  const profileCacheKey = React.useMemo(
    () => (userId ? `gitgud_profile_${userId}` : undefined),
    [userId]
  );
  const { messages, isStreaming, sendMessage } = useChat(userId, flowId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [profileData, setProfileData] = useState<CachedProfile>({});
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [memoryCheckDone, setMemoryCheckDone] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userNearBottomRef = useRef(true);
  const [showNewMessageNotice, setShowNewMessageNotice] = useState(false);

  const persistProfile = React.useCallback(
    (updater: (prev: typeof profileData) => typeof profileData) => {
      setProfileData((prev) => {
        const next = updater(prev);
        if (profileCacheKey) {
          try {
            localStorage.setItem(profileCacheKey, JSON.stringify(next));
          } catch (err) {
            console.warn("Failed to store cached profile", err);
          }
        }
        return next;
      });
    },
    [profileCacheKey]
  );

  // Hydrate from cached profile for instant display
  useEffect(() => {
    if (!profileCacheKey || !userId) return;
    try {
      const cached = localStorage.getItem(profileCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setProfileData((prev) => {
          const merged = { ...parsed, ...prev };
          if (merged.founder && merged.background) {
            merged.ready = true;
            setHasExistingProfile(true);
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn("Failed to load cached profile", err);
    }
  }, [profileCacheKey, userId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for existing memory on mount
  useEffect(() => {
    // Look for signals in the first assistant message that memory exists
    const firstAssistantMsg = messages.find(m => m.role === "assistant");
    if (firstAssistantMsg && !memoryCheckDone) {
      setMemoryCheckDone(true);
      
      // Check if the message indicates existing knowledge
      const content = firstAssistantMsg.content.toLowerCase();
      const knowledgeIndicators = [
        "i already know",
        "i remember you",
        "according to my memory",
        "from what i know about you",
        "based on our previous",
        "we've discussed",
        "you've told me",
      ];
      
      const hasKnowledge = knowledgeIndicators.some(indicator => content.includes(indicator));
      
      if (hasKnowledge) {
        setHasExistingProfile(true);
        // Set some default profile data to indicate completion
        persistProfile(() => ({
          ready: true
        }));
      }
    }
  }, [messages, memoryCheckDone]);

  const latestProfileJson = React.useMemo(() => {
    for (const msg of [...messages].filter((m) => m.role === "assistant").reverse()) {
      if (!msg.content) continue;
      const content = stripAnsiCodes(msg.content);
      const match = content.match(PROFILE_BLOCK_REGEX);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }, [messages]);

  const latestProfileUpdate = React.useMemo<Partial<Record<ProfileTextField, string>> | null>(() => {
    if (!latestProfileJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(latestProfileJson) as Record<string, unknown>;
      const sanitizedUpdate: Partial<Record<ProfileTextField, string>> = {};
      PROFILE_TEXT_FIELDS.forEach((field) => {
        const rawValue = parsed[field as keyof typeof parsed];
        if (typeof rawValue === "string") {
          const cleaned = sanitizeValue(rawValue);
          if (cleaned) {
            sanitizedUpdate[field] = cleaned;
          }
        }
      });
      if (!Object.keys(sanitizedUpdate).length) {
        return null;
      }
      return sanitizedUpdate;
    } catch (error) {
      console.warn("Failed to parse founder profile JSON block:", error);
      return null;
    }
  }, [latestProfileJson]);

  useEffect(() => {
    if (!latestProfileUpdate) {
      return;
    }
    persistProfile((prev) => {
      let hasChanges = !prev.ready;
      const next: CachedProfile = {
        ...prev,
        ready: true
      };

      (Object.entries(latestProfileUpdate) as Array<[ProfileTextField, string]>).forEach(([field, value]) => {
        if (next[field] !== value) {
          hasChanges = true;
          next[field] = value;
        }
      });

      if (!hasChanges) {
        return prev;
      }

      if (next.founder && next.background) {
        setHasExistingProfile(true);
      }
      return next;
    });
  }, [latestProfileUpdate, persistProfile]);

  useEffect(() => {
    const latestAssistant = [...messages].filter((m) => m.role === "assistant").pop();
    if (!latestAssistant || !latestAssistant.content) {
      return;
    }
    const normalized = stripAnsiCodes(latestAssistant.content).toLowerCase();
    const hasChecklist = normalized.includes("[x] bio/background");
    const hasReadyCue = normalized.includes("identity scan complete") || normalized.includes("ready");
    const flowCompleteCue =
      latestAssistant.content.includes("IDEATION_RESULTS") ||
      latestAssistant.content.includes("SPRINT_PLAN") ||
      latestAssistant.content.includes("VIBECELERATOR_STATUS");
    if ((hasReadyCue || flowCompleteCue) && !profileData.ready) {
      persistProfile((prev) => ({ ...prev, ready: true }));
    }
    if (hasChecklist) {
      setHasExistingProfile(true);
    }
  }, [messages, persistProfile, profileData.ready]);

  const displayProfile = React.useMemo(() => {
    if (!latestProfileUpdate) {
      return profileData;
    }
    return {
      ...profileData,
      ...latestProfileUpdate
    };
  }, [profileData, latestProfileUpdate]);

  const handleScroll = React.useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 160;
    userNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMessageNotice(false);
    }
  }, []);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return;
    }
    if (userNearBottomRef.current || lastMessage.role === "user") {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
      setShowNewMessageNotice(false);
    } else if (lastMessage.role === "assistant") {
      setShowNewMessageNotice(true);
    }
  }, [messages]);

  const jumpToLatest = React.useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    userNearBottomRef.current = true;
    setShowNewMessageNotice(false);
  }, []);

  const handleProfileFieldsSave = React.useCallback(
    async (fields: Partial<Record<ProfileTextField, string>>) => {
      if (!userId) {
        throw new Error("Missing user id.");
      }
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({ profile: fields })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save profile.");
      }
      const data = await response.json();
      const updatedProfile = data?.profile;
      if (!updatedProfile || typeof updatedProfile !== "object") {
        throw new Error("Server response missing updated profile.");
      }
      persistProfile(() => ({
        ...updatedProfile,
        ready: true
      }));
    },
    [persistProfile, userId]
  );

  // Initial greeting if empty
  useEffect(() => {
    // Only send initial message if we have no history at all
    if (messages.length === 0 && !seedRef.current && !hasExistingProfile) {
      seedRef.current = true;
      // Don't force the user to type first, just let the agent introduce itself naturally.
      // We trigger the agent with a hidden system prompt essentially.
      sendMessage("Hi! I'm ready to build my founder profile. Please introduce yourself and start the identity scan.");
    }
  }, [messages.length, sendMessage, hasExistingProfile]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    
    // Handle commands
    if (text.startsWith('/')) {
      if (text === '/show' || text === '/debug') {
        setShowDebug(!showDebug);
        setDraft("");
        return;
      }
      if (text === '/hide') {
        setShowDebug(false);
        setDraft("");
        return;
      }
    }
    
    setDraft("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    setUploadingFile(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // For now, we'll send a message about the PDF upload
      // In a real implementation, you'd upload to a server and process the PDF
      await sendMessage(`I'd like to upload my resume/document: ${file.name} (PDF upload feature coming soon)`);
      
      // Clear the input
      e.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Calculate profile depth (word count as proxy)
  const wordCount = Object.values(displayProfile).join(' ').split(/\s+/).filter(Boolean).length;
  // Also count user's total input
  const userWordCount = messages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  
  const totalWordCount = hasExistingProfile ? 200 : (wordCount > 0 ? wordCount : userWordCount); // Assume existing profiles are "high" depth
  const profileDepth = totalWordCount < 50 ? 'low' : totalWordCount < 150 ? 'medium' : 'high';
  const depthColor = profileDepth === 'low' ? 'text-status-warning' : profileDepth === 'medium' ? 'text-status-info' : 'text-status-success';
  
  // Alias for backward compatibility in JSX
  const isProfileComplete = hasExistingProfile || profileData.ready;
  const showNextButton = isProfileComplete || userMessageCount >= 5;

  return (
    <div className="relative flex flex-col h-full bg-bg-surface">
      {/* Header Area */}
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-surface-soft">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] font-semibold tracking-[0.3em] uppercase ${mergedVibe.accentClass.replace('text-', 'text-brand-')}`}>
              {mergedVibe.badge}
            </span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`text-[10px] uppercase tracking-wider transition-colors ${
                  showDebug ? "text-accent-yellow" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {showDebug ? "[Hide]" : "[Debug]"}
              </button>
            </div>
          </div>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-sm text-text-secondary max-w-xl">{mergedVibe.description}</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 min-h-0 bg-bg-body"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            showDebug={showDebug}
            onProfileSave={handleProfileFieldsSave}
          />
        ))}
        {!hasExistingProfile && isProfileComplete && (
          <div className="mt-4 p-3 border border-status-success/30 bg-status-success/10 rounded-lg">
            <p className="text-sm text-status-success">
              ✅ Profile scanned! Let's dive in.
            </p>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {showNewMessageNotice && (
        <button
          onClick={jumpToLatest}
          className="absolute bottom-28 right-6 rounded-full border border-border-strong bg-bg-surface-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-primary shadow-lg backdrop-blur transition hover:border-border-subtle hover:bg-bg-surface"
        >
          New mentor reply ↓
        </button>
      )}

      {/* Input Area */}
      <div className="p-4 bg-bg-surface border-t border-border-subtle relative z-10">
          {/* Status/Next Area */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-accent-yellow animate-ping" : (showNextButton ? "bg-status-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-text-muted")}`} />
              {isStreaming
                ? "COOKING 🍳..."
                : profileData.ready
                  ? "READY ✨"
                  : showNextButton
                    ? "STEP COMPLETE ✅"
                    : "WAITING..."}
            </div>
          </div>

          <button
            onClick={onComplete}
            disabled={!showNextButton}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${
              showNextButton
                ? "bg-brand-primary text-text-inverse shadow-lg hover:bg-brand-primary-soft hover:scale-105 active:scale-95"
                : "bg-bg-surface-soft text-text-muted border border-border-subtle cursor-not-allowed opacity-50 grayscale"
            }`}
          >
            <span className="text-xs">NEXT STEP</span>
            <svg className="w-3 h-3" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Input Box */}
        <div className="flex flex-col gap-2 group/input">
          <div className="flex items-end gap-2 bg-bg-surface-soft rounded-xl p-2 border border-border-subtle focus-within:border-brand-primary focus-within:bg-bg-surface transition-all duration-300 shadow-sm">
            <textarea
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none min-w-0 py-2.5 text-base resize-none max-h-32 overflow-y-auto font-medium"
              style={{ WebkitTextFillColor: "var(--text-primary)" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />

            {/* File Upload Button */}
            <label
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-bg-body cursor-pointer transition-all shrink-0"
              title="Attach PDF resume"
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
              {uploadingFile ? (
                <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5 text-text-muted hover:text-brand-primary transition"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 6.75v8.25a4.5 4.5 0 01-9 0v-9A3.75 3.75 0 0111.25 2.25c2.071 0 3.75 1.679 3.75 3.75v8.25a2.25 2.25 0 11-4.5 0V7.5"
                  />
                </svg>
              )}
            </label>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 shrink-0 ${
                draft.trim() 
                  ? "bg-brand-primary text-text-inverse hover:bg-brand-primary-soft hover:scale-105 shadow-md" 
                  : "bg-bg-body text-text-muted cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-text-muted font-mono">
              💡 Upload resume/deck
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              ⏎ to send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
