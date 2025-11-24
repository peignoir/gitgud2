import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";

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

const DEFAULT_SEED =
  "Hi! I'm ready to build my founder profile. Please introduce yourself and start the identity scan.";

const DEFAULT_VIBE = {
  badge: "AGENT ONLINE",
  description: "Fast, terse YC-style coaching.",
  accentClass: "text-yellow-300",
  panelClassName: "bg-[#0e111b]"
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
  const [draft, setDraft] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");
  const sanitize = (value?: string) =>
    value ? stripAnsi(value).replace(/\s+/g, " ").trim() : value;

  const [profileData, setProfileData] = useState<{
    founder?: string;
    location?: string;
    background?: string;
    loves?: string;
    hates?: string;
    unfair_advantages?: string;
    stage?: string;
    goals?: string;
    ready?: boolean;
  }>({});
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [memoryCheckDone, setMemoryCheckDone] = useState(false);

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
            // INSTANT welcome for returning users - no waiting for AI
            setHasExistingProfile(true);
            setMemoryCheckDone(true); // Skip the AI memory check
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

  // Check for existing memory on mount - only if cache didn't already detect it
  useEffect(() => {
    // Skip if we already detected existing profile from cache
    if (hasExistingProfile && memoryCheckDone) {
      return;
    }
    
    // Look for signals in the first assistant message that memory exists
    const firstAssistantMsg = messages.find(m => m.role === "assistant");
    if (firstAssistantMsg && !memoryCheckDone) {
      setMemoryCheckDone(true);
      
      // Check if the message indicates existing knowledge
      const content = firstAssistantMsg.content.toLowerCase();
      const knowledgeIndicators = [
        "welcome back",
        "i already know",
        "i remember you",
        "according to my memory",
        "from what i know about you",
        "based on our previous",
        "we've discussed",
        "you've told me",
        "your profile is ready"
      ];
      
      const hasKnowledge = knowledgeIndicators.some(indicator => content.includes(indicator));
      
      if (hasKnowledge && !hasExistingProfile) {
        setHasExistingProfile(true);
      }
    }
  }, [messages, memoryCheckDone, hasExistingProfile]);

  // Extract profile data from messages
  useEffect(() => {
    // Look through all assistant messages for profile data
    for (const msg of messages.filter(m => m.role === "assistant").reverse()) {
      if (msg.content) {
        // detect checklist ready signal
        if (msg.content.toLowerCase().includes("[x] bio/background")) {
          setHasExistingProfile(true);
          persistProfile((prev) => ({ ...prev, ready: true }));
        }
        // Check if message contains READY signal
        if (msg.content.includes('READY')) {
          persistProfile(prev => ({ ...prev, ready: true }));
        }
        
        // Detect completion signals for other flows
        if (msg.content.includes('IDEATION_RESULTS') || 
            msg.content.includes('SPRINT_PLAN') || 
            msg.content.includes('VIBECELERATOR_STATUS')) {
           persistProfile(prev => ({ ...prev, ready: true }));
        }
        
        // Robust JSON extraction
        try {
          const contentToParse = stripAnsi(msg.content);
          
          // 1. Try to find the JSON block
          // We look for the block, but we also fall back to looking for the JSON object directly
          let jsonContent = "";
          const codeBlockMatch = contentToParse.match(/```(?:json)?(?:\s*FOUNDER_PROFILE)?\s*([\s\S]*?)\s*```/i);
          
          if (codeBlockMatch) {
            jsonContent = codeBlockMatch[1];
          } else {
            // Fallback: look for a large JSON-like object { "founder": ... }
            const objectMatch = contentToParse.match(/\{[\s\S]*"founder"[\s\S]*\}/);
            if (objectMatch) {
              jsonContent = objectMatch[0];
            }
          }

          if (jsonContent) {
            // Attempt 1: Clean and Parse
            try {
              // Handle common LLM JSON errors:
              // 1. Real newlines inside strings (forbidden in JSON) -> replace with space or \n
              // 2. Trailing commas -> remove
              let cleanJson = jsonContent
                .replace(/,\s*}/g, "}") // remove trailing comma
                // escape unescaped newlines in strings? Difficult to do perfectly with regex.
                // instead, we hope standard parse works, or we use the regex extractor below.
              
              const data = JSON.parse(cleanJson);
              
              if (data.founder || data.background) {
                persistProfile(prev => {
                  const next = {
                    ...prev,
                    ...data,
                    founder: sanitize(data.founder),
                    location: sanitize(data.location),
                    background: sanitize(data.background),
                    loves: sanitize(data.loves),
                    hates: sanitize(data.hates),
                    unfair_advantages: sanitize(data.unfair_advantages),
                    ready: true // Force ready if we got a valid parse
                  };
                  if (next.founder && next.background) {
                     setHasExistingProfile(true);
                  }
                  return next;
                });
                // If we successfully parsed, we're done with this message
                continue;
              }
            } catch (e) {
              // console.log("Standard parse failed, trying regex extraction");
            }

            // Attempt 2: Regex Extraction (Roboust to bad JSON)
            // We look for keys and capture values until the next quote-comma-newline sequence or similar
            const extractField = (text: string, key: string) => {
              // Match "key": "value" handling escaped quotes and newlines
              // We assume keys are "key"
              const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*[,}]\\s*)`, "i");
              const match = text.match(regex);
              return match ? match[1] : undefined;
            };

            const founder = extractField(jsonContent, "founder");
            const location = extractField(jsonContent, "location");
            const background = extractField(jsonContent, "background");
            const loves = extractField(jsonContent, "loves");
            const hates = extractField(jsonContent, "hates");
            const unfair_advantages = extractField(jsonContent, "unfair_advantages");

            if (founder || background) {
              persistProfile(prev => {
                const next = {
                  ...prev,
                  founder: founder ? sanitize(founder) : prev.founder,
                  location: location ? sanitize(location) : prev.location,
                  background: background ? sanitize(background) : prev.background,
                  loves: loves ? sanitize(loves) : prev.loves,
                  hates: hates ? sanitize(hates) : prev.hates,
                  unfair_advantages: unfair_advantages ? sanitize(unfair_advantages) : prev.unfair_advantages,
                };
                
                if (next.founder && next.background) {
                   next.ready = true;
                   setHasExistingProfile(true);
                }
                return next;
              });
            }
          }
        } catch (e) {
          // Fail silently
        }
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
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

  // Debug: Check if profile is "complete" by looking for a signal in the messages
  // In a real app, the backend would send a specific event, but for now we can adds a "manual" next button
  // or look for keywords. We'll add a manual "I'm done" button for this MVP phase.
  // Calculate profile completion
  const requiredFields = ['founder', 'background', 'stage', 'goals'];
  const filledFields = requiredFields.filter(field => profileData[field as keyof typeof profileData]);
  const completionPercent = hasExistingProfile ? 100 : Math.round((filledFields.length / requiredFields.length) * 100);
  
  // Alternative completion check: if user has had substantial back-and-forth
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const hasSubstantialConversation = userMessageCount >= 3;
  
  // Show Next button if profile is complete OR user has had enough interaction OR has existing profile OR READY signal
  const isProfileFlow = !flowId || flowId === 'flow_profile';
  let isStepComplete = hasExistingProfile || profileData.ready;

  if (!isStepComplete) {
    if (isProfileFlow) {
      // Fast track: If we have founder name and background, we are good to go.
      isStepComplete = (!!profileData.founder && !!profileData.background) || completionPercent >= 100 || (completionPercent >= 50 && hasSubstantialConversation);
    } else {
      // Other flows: rely on READY signal or substantial conversation
      isStepComplete = hasSubstantialConversation;
    }
  }
  
  // Alias for backward compatibility in JSX
  const isProfileComplete = isStepComplete;
  
  // Force show next button if user has sent enough messages (fallback)
  const showNextButton = isProfileComplete || userMessageCount >= 5;

  const statusLabel = isStreaming
    ? "Agent responding"
    : showNextButton
    ? "Ready for next step"
    : "Waiting for input";
  const readyCopy = overrideSeed || mergedVibe.description || DEFAULT_SEED;

  return (
    <div
      className={`flex h-full flex-col rounded-3xl border border-white/10 bg-bg-surface-soft ${mergedVibe.panelClassName || ""}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className={`text-[10px] uppercase tracking-[0.4em] ${mergedVibe.accentClass || "text-brand-primary"}`}>
          {mergedVibe.badge}
        </span>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isStreaming
                ? "bg-brand-primary animate-pulse"
                : showNextButton
                ? "bg-brand-primary"
                : "bg-border-subtle"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-text-primary">
              <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">Ready when you are</p>
              <p className="mt-2 whitespace-pre-line">{readyCopy}</p>
              {placeholder && <p className="mt-2 text-xs text-text-secondary">{placeholder}</p>}
            </div>
          )}

          {profileData.founder && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-text-primary">{profileData.founder}</p>
              {profileData.background && <p className="mt-1 text-sm text-text-secondary">{profileData.background}</p>}
            </div>
          )}

          {hasExistingProfile && (
            <div className="rounded-2xl border border-brand-primary/25 bg-brand-primary/10 p-3 text-xs uppercase tracking-[0.3em] text-brand-primary">
              Profile cached. Update anything or tap Next.
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/10 bg-bg-surface px-4 py-3 space-y-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-text-muted">
          <span>{statusLabel}</span>
          <button
            onClick={onComplete}
            disabled={!showNextButton}
            className={`rounded-full px-4 py-2 text-[10px] font-semibold tracking-[0.3em] transition ${
              showNextButton
                ? "bg-brand-primary text-text-inverse shadow hover:bg-brand-primary-soft"
                : "bg-white/5 text-text-muted cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
              draft.trim()
                ? "bg-brand-primary text-text-inverse hover:bg-brand-primary-soft"
                : "bg-white/5 text-text-muted cursor-not-allowed"
            }`}
          >
            Send
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-text-muted">
          <label className="cursor-pointer hover:text-text-primary">
            {uploadingFile ? "Uploading…" : "Attach PDF"}
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
          </label>
          <span>Enter sends</span>
        </div>
      </div>
    </div>
  );
};
