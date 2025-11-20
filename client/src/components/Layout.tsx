import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  onReset?: () => void;
  step?: number;
  totalSteps?: number;
  stepTitle?: string;
  stepColor?: string;
  hero?: React.ReactNode;
  chromeTone?: string;
  contentClassName?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onReset,
  step = 0,
  totalSteps = 5,
  stepTitle,
  stepColor = "text-yellow-400",
  hero,
  chromeTone = "bg-[#060911]",
  contentClassName = ""
}) => {
  const accentBgClass = stepColor.replace("text-", "bg-");

  return (
    <div className={`flex flex-col h-[100dvh] ${chromeTone} text-white font-mono overflow-hidden`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e111b]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 ${accentBgClass} shadow-[0_0_8px_currentColor]`} />
          <span className="font-bold tracking-tight text-lg text-gray-100">
            GitGud.vc <span className="text-gray-500 text-xs font-normal">· v2</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              [RESET]
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar & Step Title */}
      {totalSteps > 0 && step > 0 && (
        <div className="bg-[#0e111b] border-b border-white/5">
          <div className="w-full h-1 bg-gray-800">
            <div
              className={`h-full transition-all duration-500 ease-out ${accentBgClass}`}
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <div className="px-4 py-3 flex items-center justify-between bg-[#0e111b]">
             <div className="flex flex-col">
               <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                 Step {step} of {totalSteps}
               </span>
               <span className={`text-sm font-bold uppercase tracking-wider ${stepColor}`}>
                 {stepTitle || "Loading..."}
               </span>
             </div>
             <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${i + 1 <= step ? accentBgClass : "bg-gray-800"}`}
                  />
                ))}
             </div>
           </div>
        </div>
      )}

      {hero && (
        <section className="border-b border-white/5">{hero}</section>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden relative ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
};
