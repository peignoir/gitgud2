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
  const isLightMode = chromeTone.includes("bg-white");

  return (
    <div className={`flex flex-col h-[100dvh] ${chromeTone} ${isLightMode ? "text-black" : "text-white"} font-mono pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}>
      {/* Simple Fixed Header */}
      <div className="bg-white border-b border-gray-200">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${accentBgClass}`} />
            <span className="font-bold tracking-tight text-lg text-gray-900">
              GitGud.vc
            </span>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
            >
              [RESET]
            </button>
          )}
        </header>
      </div>

      {/* Simplified Progress Indicator */}
      {topNav && (
        <div className="bg-gray-50 border-b border-gray-200 overflow-x-auto no-scrollbar">
          <div className="min-w-max px-4">
            {topNav}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {hero && (
          <section className="border-b border-white/5 shrink-0">{hero}</section>
        )}
        
        <main className={`flex-1 flex flex-col min-h-0 ${contentClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
