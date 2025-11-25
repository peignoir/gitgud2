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
  "Share your name and LinkedIn (or a quick bio) to get started.";

const DEFAULT_VIBE = {
  badge: "DEEP RESEARCH MODE",
  description: "I'll research your background thoroughly.",
  accentClass: "",
  panelClassName: ""
};

export const ProfileStep: React.FC<ProfileStepProps> = ({
  userId,
  onComplete,
  flowId,
  overrideSeed,
  placeholder = "Share your LinkedIn or introduce yourself...",
  vibe = DEFAULT_VIBE
}) => {
  const mergedVibe = { ...DEFAULT_VIBE, ...vibe };
  const profileCacheKey = React.useMemo(
    () => (userId ? `ncacc_profile_${userId}` : undefined),
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
    experience_tier?: string;
    funding_history?: string;
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
            setHasExistingProfile(true);
            setMemoryCheckDone(true);
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
    if (hasExistingProfile && memoryCheckDone) return;
    
    const firstAssistantMsg = messages.find(m => m.role === "assistant");
    if (firstAssistantMsg && !memoryCheckDone) {
      setMemoryCheckDone(true);
      const content = firstAssistantMsg.content.toLowerCase();
      const knowledgeIndicators = [
        "welcome back", "i already know", "i remember you",
        "your profile is ready", "returning user"
      ];
      if (knowledgeIndicators.some(indicator => content.includes(indicator))) {
        setHasExistingProfile(true);
      }
    }
  }, [messages, memoryCheckDone, hasExistingProfile]);

  // Extract profile data from messages
  useEffect(() => {
    for (const msg of messages.filter(m => m.role === "assistant").reverse()) {
      if (msg.content) {
        if (msg.content.includes('READY')) {
          persistProfile(prev => ({ ...prev, ready: true }));
        }
        
        if (msg.content.includes('IDEATION_RESULTS') || 
            msg.content.includes('SPRINT_PLAN') || 
            msg.content.includes('VIBECELERATOR_STATUS')) {
           persistProfile(prev => ({ ...prev, ready: true }));
        }
        
        try {
          const contentToParse = stripAnsi(msg.content);
          let jsonContent = "";
          const codeBlockMatch = contentToParse.match(/```(?:json)?(?:\s*FOUNDER_PROFILE)?\s*([\s\S]*?)\s*```/i);
          
          if (codeBlockMatch) {
            jsonContent = codeBlockMatch[1];
          } else {
            const objectMatch = contentToParse.match(/\{[\s\S]*"founder"[\s\S]*\}/);
            if (objectMatch) {
              jsonContent = objectMatch[0];
            }
          }

          if (jsonContent) {
            try {
              const cleanJson = jsonContent.replace(/,\s*}/g, "}");
              const data = JSON.parse(cleanJson);
              
              if (data.founder || data.background) {
                persistProfile(prev => {
                  const next = {
                    ...prev,
                    ...data,
                    founder: sanitize(data.founder),
                    location: sanitize(data.location),
                    background: sanitize(data.background),
                    experience_tier: data.experience_tier,
                    funding_history: sanitize(data.funding_history),
                    loves: sanitize(data.loves),
                    hates: sanitize(data.hates),
                    unfair_advantages: sanitize(data.unfair_advantages),
                    ready: true
                  };
                  if (next.founder && next.background) {
                     setHasExistingProfile(true);
                  }
                  return next;
                });
                continue;
              }
            } catch (e) {
              // Try regex extraction
            }

            const extractField = (text: string, key: string) => {
              const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*[,}]\\s*)`, "i");
              const match = text.match(regex);
              return match ? match[1] : undefined;
            };

            const founder = extractField(jsonContent, "founder");
            const background = extractField(jsonContent, "background");

            if (founder || background) {
              persistProfile(prev => {
                const next = {
                  ...prev,
                  founder: founder ? sanitize(founder) : prev.founder,
                  background: background ? sanitize(background) : prev.background,
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
    
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    setUploadingFile(true);
    
    try {
      await sendMessage(`I'd like to upload my resume/document: ${file.name}`);
      e.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const userMessageCount = messages.filter(m => m.role === "user").length;
  const hasSubstantialConversation = userMessageCount >= 3;
  const isProfileFlow = !flowId || flowId === 'flow_profile';
  
  let isStepComplete = hasExistingProfile || profileData.ready;
  if (!isStepComplete) {
    if (isProfileFlow) {
      isStepComplete = (!!profileData.founder && !!profileData.background);
    } else {
      isStepComplete = hasSubstantialConversation;
    }
  }
  
  const showNextButton = isStepComplete || userMessageCount >= 5;
  const readyCopy = overrideSeed || mergedVibe.description || DEFAULT_SEED;

  // Experience tier badge
  const tierBadge = profileData.experience_tier ? {
    'first-time': { label: 'First-time Founder', color: 'var(--color-accent)' },
    'experienced': { label: 'Experienced', color: 'var(--status-success)' },
    'serial': { label: 'Serial Founder', color: 'var(--color-accent-2)' }
  }[profileData.experience_tier] : null;

  return (
    <div
      className="flex h-full flex-col glass rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-[var(--space-lg)] py-[var(--space-md)] border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-[var(--space-md)]">
          <span 
            className="text-[11px] uppercase tracking-[0.2em] font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
              {mergedVibe.badge}
          </span>
          {tierBadge && (
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: `${tierBadge.color}20`,
                color: tierBadge.color
              }}
            >
              {tierBadge.label}
            </span>
            )}
          </div>
        <div className="flex items-center gap-[var(--space-sm)]">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isStreaming 
                ? 'var(--color-accent)' 
                : showNextButton 
                ? 'var(--status-success)' 
                : 'var(--color-text-muted)'
            }}
          />
          <span 
            className="text-[11px] font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {isStreaming ? "Researching..." : showNextButton ? "Ready" : "Waiting"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto px-[var(--space-lg)] py-[var(--space-lg)] space-y-[var(--space-md)]">
          
          {/* Welcome card when empty */}
          {messages.length === 0 && (
            <div 
              className="glass rounded-[var(--radius-md)] p-[var(--space-lg)] border"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <p 
                className="text-[11px] uppercase tracking-[0.2em] font-medium mb-[var(--space-sm)]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Ready when you are
              </p>
              <p 
                className="text-[16px] leading-relaxed"
                style={{ color: 'var(--color-text)' }}
              >
                {readyCopy}
              </p>
              <p 
                className="text-[13px] mt-[var(--space-md)]"
                style={{ color: 'var(--color-text-soft)' }}
              >
                {placeholder}
              </p>
            </div>
          )}

          {/* Profile summary card */}
          {profileData.founder && (
            <div 
              className="glass rounded-[var(--radius-md)] p-[var(--space-lg)] border"
              style={{ borderColor: 'var(--color-accent-soft)' }}
            >
              <p 
                className="text-[16px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {profileData.founder}
              </p>
            {profileData.background && (
                <p 
                  className="text-[14px] mt-[var(--space-sm)] leading-relaxed"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  {profileData.background}
                </p>
              )}
              {profileData.funding_history && profileData.funding_history !== 'N/A' && (
                <p 
                  className="text-[13px] mt-[var(--space-sm)]"
                  style={{ color: 'var(--color-accent)' }}
                >
                  💰 {profileData.funding_history}
                </p>
              )}
          </div>
        )}
        
          {/* Returning user notice */}
          {hasExistingProfile && (
            <div 
              className="rounded-[var(--radius-md)] p-[var(--space-md)] text-[13px] font-medium"
              style={{ 
                backgroundColor: 'var(--color-accent-soft)',
                color: 'var(--color-accent)'
              }}
            >
              Profile loaded. Update anything or continue to next step.
          </div>
        )}

          {/* Chat messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div 
        className="glass px-[var(--space-lg)] py-[var(--space-md)] border-t space-y-[var(--space-md)]"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        {/* Status + Next button */}
        <div className="flex items-center justify-between">
          <span 
            className="text-[11px] font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {isStreaming ? "Agent researching..." : showNextButton ? "Ready to continue" : "Waiting for input"}
              </span>
          <button
            onClick={onComplete}
            disabled={!showNextButton}
            className="spring text-[13px] font-semibold px-[var(--space-lg)] rounded-[var(--radius-md)] transition-all"
            style={{ 
              minHeight: 'var(--tap-min)',
              background: showNextButton 
                ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)' 
                : 'var(--color-bg-elevated)',
              color: showNextButton ? 'white' : 'var(--color-text-muted)',
              opacity: showNextButton ? 1 : 0.5,
              cursor: showNextButton ? 'pointer' : 'not-allowed'
            }}
          >
            Next Step →
          </button>
        </div>

        {/* Input row */}
        <div 
          className="flex items-end gap-[var(--space-sm)] rounded-[var(--radius-md)] border px-[var(--space-md)] py-[var(--space-sm)]"
          style={{ 
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-border-subtle)'
          }}
        >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
            className="flex-1 resize-none bg-transparent text-[16px] outline-none py-[var(--space-sm)]"
            style={{ 
              color: 'var(--color-text)',
              minHeight: 'var(--tap-min)'
            }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
            className="spring flex items-center justify-center rounded-[var(--radius-md)] text-[14px] font-semibold transition-all"
            style={{ 
              width: 'var(--tap-min)',
              height: 'var(--tap-min)',
              background: draft.trim() 
                ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)' 
                : 'var(--color-bg-elevated)',
              color: draft.trim() ? 'white' : 'var(--color-text-muted)'
            }}
          >
            ↑
            </button>
          </div>
          
        {/* Helper text */}
        <div 
          className="flex items-center justify-between text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <label className="spring cursor-pointer flex items-center gap-[var(--space-xs)]" style={{ minHeight: 'var(--tap-min)', display: 'flex', alignItems: 'center' }}>
            📎 {uploadingFile ? "Uploading…" : "Attach PDF"}
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
          </label>
          <span>Return to send</span>
        </div>
      </div>
    </div>
  );
};
