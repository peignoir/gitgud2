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

// Quick action chips per flow type
const QUICK_ACTIONS: Record<string, { label: string; prompt: string; emoji: string }[]> = {
  flow_profile: [
    { label: "I'm technical", prompt: "I'm a technical founder with engineering background", emoji: "💻" },
    { label: "First-time founder", prompt: "I'm a first-time founder", emoji: "🌱" },
    { label: "Serial entrepreneur", prompt: "I've built and sold companies before", emoji: "🚀" },
  ],
  flow_ideation: [
    { label: "B2B SaaS", prompt: "I want to explore B2B SaaS ideas", emoji: "🏢" },
    { label: "Consumer", prompt: "I'm interested in consumer products", emoji: "📱" },
    { label: "AI/ML", prompt: "I want to leverage AI in my startup", emoji: "🤖" },
    { label: "Surprise me", prompt: "Give me something unexpected based on my profile", emoji: "✨" },
  ],
  flow_sprint: [
    { label: "Landing page", prompt: "Help me build a landing page in 90 minutes", emoji: "🎨" },
    { label: "Customer calls", prompt: "Help me set up 5 customer discovery calls", emoji: "📞" },
    { label: "MVP scope", prompt: "Help me define the smallest possible MVP", emoji: "🎯" },
  ],
  flow_vibecelerator: [
    { label: "Check in", prompt: "Here's my progress update", emoji: "📊" },
    { label: "I'm stuck", prompt: "I'm feeling stuck, need help", emoji: "🆘" },
    { label: "Celebrate", prompt: "I hit a milestone!", emoji: "🎉" },
  ],
  flow_console: [
    { label: "Fundraising", prompt: "Should I raise money now?", emoji: "💰" },
    { label: "Growth", prompt: "How do I get my first 100 users?", emoji: "📈" },
    { label: "Hiring", prompt: "When should I make my first hire?", emoji: "👥" },
    { label: "Pricing", prompt: "How should I price my product?", emoji: "💵" },
  ],
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
  const sanitizeField = (value: unknown) => {
    if (typeof value === "string") {
      return sanitize(value);
    }
    if (Array.isArray(value)) {
      return sanitize(value.join("; "));
    }
    return undefined;
  };

  const [profileData, setProfileData] = useState<{
    founder?: string;
    location?: string;
    background?: string;
    experience_tier?: string;
    funding_history?: string;
    loves?: string;
    hates?: string;
    unfair_advantages?: string;
    weaknesses?: string;
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
                    founder: sanitizeField(data.founder),
                    location: sanitizeField(data.location),
                    background: sanitizeField(data.background),
                    experience_tier: data.experience_tier,
                    funding_history: sanitizeField(data.funding_history),
                    loves: sanitizeField(data.loves),
                    hates: sanitizeField(data.hates),
                    unfair_advantages: sanitizeField(data.unfair_advantages),
                    weaknesses: sanitizeField(data.weaknesses),
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

  const stripFounderProfileBlock = (text: string): string => {
    if (!text) return text;
    // Aggressively remove JSON blocks regardless of tags
    let withoutJson = text.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, "");
    
    // Also catch the FOUNDER_PROFILE format specifically if not caught above
    withoutJson = withoutJson.replace(/```(?:json)?\s*FOUNDER_PROFILE[\s\S]*?```/gi, "");

    const filtered = withoutJson
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return true;
        }
        const unwantedPatterns = [
          /^MENTOR$/i,
          /^===.*===$/,
          /^\[.*\]\s*(thinking\.\.\.|.*)/i,
          /^Agent researching/i,
          /^Structured block \(internal use only\):/i
        ];
        return !unwantedPatterns.some((pattern) => pattern.test(trimmed));
      })
      .join("\n");
    return filtered.trim();
  };

  const displayMessages = messages.map((msg) => {
    if (msg.role !== "assistant" || !msg.content) {
      return msg;
    }
    const cleaned = stripFounderProfileBlock(msg.content);
    return cleaned === msg.content ? msg : { ...msg, content: cleaned };
  });

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
              
              {/* Quick action chips */}
              {flowId && QUICK_ACTIONS[flowId] && (
                <div className="flex flex-wrap gap-[var(--space-sm)] mt-[var(--space-lg)]">
                  {QUICK_ACTIONS[flowId].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setDraft(action.prompt);
                        // Auto-send after a brief moment
                        setTimeout(() => sendMessage(action.prompt), 100);
                      }}
                      className="chip spring"
                    >
                      <span>{action.emoji}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
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
          {displayMessages.map((msg) => (
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
