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

// Quick action chips per flow type
const QUICK_ACTIONS: Record<string, { label: string; prompt: string; emoji: string }[]> = {
  flow_profile: [
    { label: "I'm technical", prompt: "I'm a technical founder with engineering background", emoji: "" },
    { label: "First-time founder", prompt: "I'm a first-time founder", emoji: "" },
    { label: "Serial entrepreneur", prompt: "I've built and sold companies before", emoji: "" },
  ],
  flow_ideation: [
    { label: "B2B SaaS", prompt: "I want to explore B2B SaaS ideas", emoji: "" },
    { label: "Consumer", prompt: "I'm interested in consumer products", emoji: "" },
    { label: "AI/ML", prompt: "I want to leverage AI in my startup", emoji: "" },
    { label: "Surprise me", prompt: "Give me something unexpected based on my profile", emoji: "" },
  ],
  flow_sprint: [
    { label: "Landing page", prompt: "Help me build a landing page in 90 minutes", emoji: "" },
    { label: "Customer calls", prompt: "Help me set up 5 customer discovery calls", emoji: "" },
    { label: "MVP scope", prompt: "Help me define the smallest possible MVP", emoji: "" },
  ],
  flow_vibecelerator: [
    { label: "Check in", prompt: "Here's my progress update", emoji: "" },
    { label: "I'm stuck", prompt: "I'm feeling stuck, need help", emoji: "" },
    { label: "Celebrate", prompt: "I hit a milestone!", emoji: "" },
  ],
  flow_console: [
    { label: "Fundraising", prompt: "Should I raise money now?", emoji: "" },
    { label: "Growth", prompt: "How do I get my first 100 users?", emoji: "" },
    { label: "Hiring", prompt: "When should I make my first hire?", emoji: "" },
    { label: "Pricing", prompt: "How should I price my product?", emoji: "" },
  ],
};

export const ProfileStep: React.FC<ProfileStepProps> = ({
  userId,
  onComplete,
  flowId,
  overrideSeed,
  placeholder = "Message...",
  vibe
}) => {
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
    background?: string;
    ready?: boolean;
  }>({});
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  const profileCacheKey = React.useMemo(
    () => (userId ? `ncacc_profile_${userId}` : undefined),
    [userId]
  );

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

  // Hydrate from cached profile
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

  // Logic to extract profile (hidden from user but stored)
  useEffect(() => {
    for (const msg of messages.filter(m => m.role === "assistant").reverse()) {
      if (msg.content) {
        if (msg.content.includes('READY')) {
          persistProfile(prev => ({ ...prev, ready: true }));
        }
        
        // Simple regex extraction for founder profile
        const contentToParse = stripAnsi(msg.content);
        let jsonContent = "";
        // Try to find JSON block
        const codeBlockMatch = contentToParse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i) || 
                               contentToParse.match(/```(?:json)?\s*FOUNDER_PROFILE\s*(\{[\s\S]*?\})\s*```/i);
        
        if (codeBlockMatch) {
          jsonContent = codeBlockMatch[1];
        }

        if (jsonContent) {
          try {
            const data = JSON.parse(jsonContent);
            if (data.founder || data.background) {
              persistProfile(prev => {
                const next = {
                  ...prev,
                  founder: sanitizeField(data.founder),
                  background: sanitizeField(data.background),
                  ready: true
                };
                if (next.founder && next.background) {
                   setHasExistingProfile(true);
                }
                return next;
              });
            }
          } catch (e) {
            // ignore
          }
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
    // ... existing upload logic ...
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      await sendMessage(`I'd like to upload my resume/document: ${file.name}`);
      e.target.value = '';
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const stripFounderProfileBlock = (text: string): string => {
    if (!text) return text;
    // Remove JSON blocks
    let withoutJson = text.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, "");
    withoutJson = withoutJson.replace(/```(?:json)?\s*FOUNDER_PROFILE[\s\S]*?```/gi, "");

    // Remove system/thinking lines
    const filtered = withoutJson
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return true;
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
  if (!isStepComplete && !isProfileFlow) {
      isStepComplete = hasSubstantialConversation;
  }
  
  const showNextButton = isStepComplete || userMessageCount >= 5;

  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* Initial Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-8 mt-10">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">NC</span>
            </div>
            <h2 className="text-2xl font-semibold text-black">How can I help you today?</h2>
            
            {/* Quick Action Chips */}
            {flowId && QUICK_ACTIONS[flowId] && (
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {QUICK_ACTIONS[flowId].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setDraft(action.prompt);
                      setTimeout(() => sendMessage(action.prompt), 100);
                    }}
                    className="chip hover:bg-gray-200 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages List */}
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        <div ref={bottomRef} />
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="p-4 bg-white">
        {showNextButton && (
          <div className="flex justify-center mb-4">
             <button
              onClick={onComplete}
              className="btn-primary shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4"
            >
              Next Step <span className="opacity-70">→</span>
            </button>
          </div>
        )}

        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-[#f3f4f6] rounded-[26px] p-2 pr-3">
          {/* File Upload Trigger */}
          <label className="p-3 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors rounded-full hover:bg-gray-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
          </label>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 outline-none text-[16px] text-gray-900 placeholder:text-gray-500 py-3 resize-none max-h-[120px]"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />

          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`p-2 rounded-full mb-1 transition-all ${
              draft.trim() 
                ? "bg-black text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
