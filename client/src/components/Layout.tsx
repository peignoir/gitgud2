import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  onReset?: () => void;
  topNav?: React.ReactNode;
  contentClassName?: string;
  title?: string;
  subtitle?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onReset,
  topNav,
  contentClassName = "",
  title,
  subtitle
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
      {/* Minimal iOS-style Header */}
      <header 
        className="flex flex-col gap-1 px-[var(--space-lg)] pt-2 pb-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)]/95"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {title && (
              <span className="text-[15px] font-semibold text-gray-900">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-[12px] text-gray-500">
                {subtitle}
              </span>
            )}
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="ml-4 p-2 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Start fresh and clear profile"
            >
              Reset
            </button>
          )}
        </div>

        {topNav && (
          <div className="mt-1 -mx-1 overflow-x-auto no-scrollbar">
            {topNav}
          </div>
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
