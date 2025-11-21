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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [profileData, setProfileData] = useState<{
    founder?: string;
    background?: string;
    stage?: string;
    goals?: string;
    motivations?: string;
    strengths?: string;
    gaps?: string;
    ready?: boolean;
  }>({});
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [memoryCheckDone, setMemoryCheckDone] = useState(false);

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
        "franck" // Specific name recognition
      ];
      
      const hasKnowledge = knowledgeIndicators.some(indicator => content.includes(indicator));
      
      if (hasKnowledge) {
        setHasExistingProfile(true);
        // Set some default profile data to indicate completion
        setProfileData({
          founder: "Franck Nouyrigat",
          background: "Pre-existing profile",
          stage: "Known",
          goals: "Known"
        });
      }
    }
  }, [messages, memoryCheckDone]);

  // Extract profile data from messages
  useEffect(() => {
    // Look through all assistant messages for profile data
    for (const msg of messages.filter(m => m.role === "assistant").reverse()) {
      if (msg.content) {
        // Check if message contains READY signal
        if (msg.content.includes('READY')) {
          setProfileData(prev => ({ ...prev, ready: true }));
        }
        
        // Try multiple patterns to find JSON
        const patterns = [
          /```json\s+FOUNDER_PROFILE[^`]*({[^`]+})[^`]*```/s,
          /```json[^`]*({[^`]+})[^`]*```/s,
          /\{[^}]*"founder"[^}]*\}/s,
          /\{\s*"founder"[^}]+\}/s
        ];
        
        for (const pattern of patterns) {
          const match = msg.content.match(pattern);
          if (match) {
            try {
              // Extract the JSON part
              let jsonStr = match[0];
              // Remove markdown code blocks
              jsonStr = jsonStr.replace(/```json\s*FOUNDER_PROFILE\s*|```json|```/g, '').trim();
              // Extract just the object if it has a label
              const objMatch = jsonStr.match(/\{[\s\S]*\}/);
              if (objMatch) {
                jsonStr = objMatch[0];
              }
              
              const data = JSON.parse(jsonStr);
              if (data.founder || data.background || data.stage || data.goals) {
                setProfileData(prev => ({ ...prev, ...data }));
                console.log('Extracted profile data:', data);
              }
            } catch (e) {
              console.log('Failed to parse JSON:', e);
            }
          }
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
  // Fast track: If we have founder name and background, we are good to go.
  const isProfileComplete = hasExistingProfile || profileData.ready || (!!profileData.founder && !!profileData.background) || completionPercent >= 100 || (completionPercent >= 50 && hasSubstantialConversation);
  
  // Force show next button if user has sent enough messages (fallback)
  const showNextButton = isProfileComplete || userMessageCount >= 5;

  // Calculate profile depth (word count as proxy)
  const wordCount = Object.values(profileData).join(' ').split(/\s+/).filter(Boolean).length;
  // Also count user's total input
  const userWordCount = messages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  
  const totalWordCount = hasExistingProfile ? 200 : (wordCount > 0 ? wordCount : userWordCount); // Assume existing profiles are "high" depth
  const profileDepth = totalWordCount < 50 ? 'low' : totalWordCount < 150 ? 'medium' : 'high';
  const depthColor = profileDepth === 'low' ? 'text-yellow-500' : profileDepth === 'medium' ? 'text-blue-500' : 'text-green-500';
  const depthEmoji = profileDepth === 'low' ? '📝' : profileDepth === 'medium' ? '📊' : '🎯';

  return (
    <div className={`flex flex-col h-full ${mergedVibe.panelClassName}`}>
      {/* Header Area */}
      <div className="px-4 py-3 border-b border-white/5 bg-white/5/30 backdrop-blur-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] font-semibold tracking-[0.3em] uppercase ${mergedVibe.accentClass}`}>
              {mergedVibe.badge}
            </span>
            
            <div className="flex items-center gap-3">
              {/* Debug Toggle */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`text-[10px] uppercase tracking-wider transition-colors ${
                  showDebug ? "text-yellow-400" : "text-gray-500 hover:text-white"
                }`}
              >
                {showDebug ? "[Hide]" : "[Debug]"}
              </button>
            </div>
          </div>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-300 max-w-xl">{mergedVibe.description}</p>
            
            {/* Progress Indicator */}
            {(completionPercent > 0 || userMessageCount > 0) && (
              <div className="flex items-center gap-2 text-xs shrink-0">
                <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-500"
                    style={{ width: `${Math.max(completionPercent, userMessageCount * 25)}%` }}
                  />
                </div>
                <span className={`${depthColor}`}>
                  {depthEmoji} {Math.max(completionPercent, Math.min(100, userMessageCount * 25))}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showDebug={showDebug} />
        ))}
        
        {/* Status Messages */}
        {hasExistingProfile && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              👋 <strong>Welcome back!</strong> I already have your profile. Update details or click Next.
            </p>
          </div>
        )}
        
        {!hasExistingProfile && isProfileComplete && (
          <div className={`mt-4 p-3 border rounded-lg ${
            profileDepth === 'high' 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <p className={`text-sm ${
              profileDepth === 'high' ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {profileDepth === 'high' 
                ? "✅ Great profile! The AI has what it needs." 
                : "💡 Profile has the basics, but could be richer."}
            </p>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/10">
          {/* Status/Next Area */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-yellow-300 animate-pulse" : (showNextButton ? "bg-emerald-500" : "bg-gray-500")}`} />
              {isStreaming ? "Thinking..." : (profileData.ready ? "Ready" : (showNextButton ? "Identity Scanned" : "Scanning Identity..."))}
            </div>
            {!showNextButton && !isStreaming && (
              <span className="text-[10px] text-yellow-500 mt-1">
                * Need name & background to continue
              </span>
            )}
          </div>

          <button
            onClick={onComplete}
            disabled={!showNextButton}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              showNextButton 
                ? "bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.1)] animate-pulse cursor-pointer" 
                : "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed opacity-50"
            }`}
          >
            NEXT STEP →
          </button>
        </div>

        {/* Input Box */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2 bg-white/5 rounded-xl p-2 border border-white/10 focus-within:border-yellow-400/50 focus-within:bg-white/10 transition-all">
            
            {/* File Upload Button */}
            <label className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group shrink-0" title="Upload PDF">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
              {uploadingFile ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </label>

            {/* Text Input */}
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
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none min-w-0 py-2.5 text-sm resize-none max-h-32 overflow-y-auto"
              style={{ WebkitTextFillColor: "#fff" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all shrink-0 ${
                draft.trim() 
                  ? "bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20" 
                  : "bg-white/5 text-gray-600 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-gray-500">
              💡 Upload resume/deck for context
            </span>
            <span className="text-[10px] text-gray-600">
              ⏎ to send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
