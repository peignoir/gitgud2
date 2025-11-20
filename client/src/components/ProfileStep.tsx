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
  "Introduce yourself and start the interview. I am ready to build my founder profile.";

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
  const { messages, isStreaming, sendMessage } = useChat(userId, flowId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [showDebug, setShowDebug] = useState(false); // Always start with debug hidden
  const [profileData, setProfileData] = useState<{
    founder?: string;
    background?: string;
    stage?: string;
    goals?: string;
    motivations?: string;
    strengths?: string;
    gaps?: string;
  }>({});

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract profile data from messages
  useEffect(() => {
    const lastMessage = messages.filter(m => m.role === "assistant").pop();
    if (lastMessage?.content) {
      const jsonMatch = lastMessage.content.match(/```json[^`]*({[^`]+})[^`]*```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          if (data.founder || data.background || data.stage || data.goals) {
            setProfileData(data);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [messages]);

  // Initial greeting if empty
  useEffect(() => {
    if (messages.length === 0 && !seedRef.current) {
      seedRef.current = true;
      sendMessage(overrideSeed || DEFAULT_SEED);
    }
  }, [messages.length, sendMessage, overrideSeed]);

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

  // Debug: Check if profile is "complete" by looking for a signal in the messages
  // In a real app, the backend would send a specific event, but for now we can adds a "manual" next button
  // or look for keywords. We'll add a manual "I'm done" button for this MVP phase.
  // Calculate profile completion
  const requiredFields = ['founder', 'background', 'stage', 'goals'];
  const filledFields = requiredFields.filter(field => profileData[field as keyof typeof profileData]);
  const completionPercent = Math.round((filledFields.length / requiredFields.length) * 100);
  const isProfileComplete = completionPercent >= 100;
  
  // Calculate profile depth (word count as proxy)
  const wordCount = Object.values(profileData).join(' ').split(/\s+/).filter(Boolean).length;
  const profileDepth = wordCount < 50 ? 'low' : wordCount < 150 ? 'medium' : 'high';
  const depthColor = profileDepth === 'low' ? 'text-yellow-500' : profileDepth === 'medium' ? 'text-blue-500' : 'text-green-500';
  const depthEmoji = profileDepth === 'low' ? '📝' : profileDepth === 'medium' ? '📊' : '🎯';

  return (
    <div className={`flex flex-col h-full ${mergedVibe.panelClassName}`}>
      <div className="px-4 py-3 border-b border-white/5 bg-white/5/30 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className={`text-[10px] font-semibold tracking-[0.3em] uppercase ${mergedVibe.accentClass}`}>
              {mergedVibe.badge}
            </span>
            <p className="text-sm text-gray-300 mt-1 max-w-xl">{mergedVibe.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Profile Completion Indicator */}
            {completionPercent > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className={`${depthColor}`}>
                  {depthEmoji} {completionPercent}%
                </span>
              </div>
            )}
            
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`text-[10px] uppercase tracking-wider transition-colors ${
                showDebug ? "text-yellow-400" : "text-gray-500 hover:text-white"
              }`}
            >
              {showDebug ? "[Hide Debug]" : "[Show Debug]"}
            </button>
            
            {isProfileComplete && (
              <button
                onClick={onComplete}
                className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded text-xs font-medium hover:bg-green-500/30 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showDebug={showDebug} />
        ))}
        
        {/* Profile completion message */}
        {isProfileComplete && profileDepth !== 'high' && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-300">
              💡 <strong>Tip:</strong> Your profile is complete but {profileDepth === 'low' ? 'quite brief' : 'could use more detail'}. 
              {' '}The more context you share, the better the AI can help you. Feel free to add more or click Next to continue.
            </p>
          </div>
        )}
        
        {isProfileComplete && profileDepth === 'high' && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              ✅ <strong>Great profile!</strong> You've provided rich context ({wordCount}+ words). 
              The AI has plenty to work with. Click Next when ready!
            </p>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-black/30 backdrop-blur-sm border-t border-white/5">
        {showDebug && (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-2">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-yellow-300 animate-pulse" : "bg-emerald-300"}`} />
            {isStreaming ? "Agent drafting…" : "Ready"}
          </div>
        )}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2 border border-white/10 focus-within:border-yellow-400/50 transition-colors">
          <input
            onKeyDown={handleKeyDown}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type="text"
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none min-w-0"
            autoComplete="off"
            style={{ WebkitTextFillColor: "#fff" }} // Force white text on iOS
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className={`font-bold transition-colors ${
              !draft.trim() ? "text-gray-600 cursor-not-allowed" : "text-yellow-400 hover:text-yellow-300"
            }`}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};
