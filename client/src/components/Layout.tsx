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
  topNav?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onReset,
  step = 0,
  totalSteps = 5,
  stepTitle,
  stepColor = "text-yellow-400",
  hero,
  chromeTone = "bg-[#0e111b]",
  contentClassName = "",
  topNav
}) => {
  const accentBgClass = stepColor.replace("text-", "bg-");

  return (
    <div className={`flex flex-col h-[100dvh] ${chromeTone} text-white font-mono`}>
      {/* Simple Fixed Header */}
      <div className="bg-[#0e111b] border-b border-white/10">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${accentBgClass} shadow-[0_0_8px_currentColor]`} />
            <span className="font-bold tracking-tight text-lg text-gray-100">
              GitGud.vc
            </span>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              [RESET]
            </button>
          )}
        </header>
      </div>

      {/* Simplified Progress Indicator */}
      {topNav && (
        <div className="bg-[#05070f] border-b border-white/10">
          {topNav}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {hero && (
          <section className="border-b border-white/5">{hero}</section>
        )}
        
        <main className={`${contentClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
