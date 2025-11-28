import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  onReset?: () => void;
  topNav?: React.ReactNode;
  contentClassName?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onReset,
  topNav,
  contentClassName = ""
}) => {
  return (
    <div 
      className="flex h-[100dvh] flex-col text-[var(--color-text)] font-sans"
      style={{ 
        backgroundColor: 'var(--color-bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {/* Minimal Header */}
      <header 
        className="flex items-center justify-between px-[var(--space-lg)] py-[var(--space-sm)]"
      >
        {/* Step Navigation (now integrated into header or just below) */}
        <div className="flex-1 overflow-x-auto no-scrollbar">
           {topNav}
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="ml-4 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Start Fresh"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <div className={`flex-1 flex flex-col ${contentClassName}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
