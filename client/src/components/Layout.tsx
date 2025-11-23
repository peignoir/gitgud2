import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  onReset?: () => void;
  step?: number;
  totalSteps?: number;
  stepTitle?: string;
  stepColor?: string;
  hero?: React.ReactNode;
  // chromeTone is deprecated but kept for compatibility if needed,
  // though we override it with our theme classes.
  chromeTone?: string; 
  contentClassName?: string;
  topNav?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onReset,
  stepColor = "text-brand-primary",
  hero,
  contentClassName = "",
  topNav
}) => {
  // Map step colors to our new brand tokens
  const accentColorClass = stepColor.includes("brand") ? "bg-brand-primary" : 
                          stepColor.includes("cyan") ? "bg-accent-blue" :
                          stepColor.includes("violet") ? "bg-accent-purple" :
                          stepColor.includes("rose") ? "bg-status-danger" :
                          stepColor.includes("emerald") ? "bg-status-success" :
                          "bg-brand-primary";

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-body text-text-primary font-mono pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Fixed Header */}
      <div className="bg-bg-surface border-b border-border-strong">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 ${accentColorClass} shadow-[0_0_8px_currentColor] rounded-sm`} />
            <span className="font-bold tracking-tight text-lg text-text-primary">
              GitGud.vc
            </span>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="text-[10px] font-bold text-status-danger hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              [RESET]
            </button>
          )}
        </header>
      </div>

      {/* Progress Indicator */}
      {topNav && (
        <div className="bg-bg-body border-b border-border-subtle overflow-x-auto no-scrollbar">
          <div className="min-w-max px-4">
            {topNav}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {hero && (
          <section className="border-b border-border-subtle shrink-0 bg-bg-surface">{hero}</section>
        )}
        
        <main className={`flex-1 flex flex-col min-h-0 bg-bg-body ${contentClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
