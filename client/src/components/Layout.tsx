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
    <div className="flex h-[100dvh] flex-col bg-bg-body text-text-primary font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">GitGud.vc</p>
          <p className="text-base font-semibold text-text-primary leading-tight">Founder Console</p>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="text-[10px] uppercase tracking-[0.4em] text-status-danger hover:text-status-warning transition-colors"
          >
            Reset
          </button>
        )}
      </header>

      {topNav && (
        <div className="border-b border-border-subtle bg-bg-surface-soft px-4 py-2">
          <div className="no-scrollbar overflow-x-auto">{topNav}</div>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-hidden">
        <div className={`flex h-full flex-col gap-4 px-4 py-4 ${contentClassName}`}>{children}</div>
      </main>
    </div>
  );
};
