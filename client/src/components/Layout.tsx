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
      {/* Header - Glass effect */}
      <header 
        className="glass flex items-center justify-between px-[var(--space-lg)] py-[var(--space-md)] border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div>
          <p 
            className="text-[11px] uppercase tracking-[0.3em] font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            NC/ACC
          </p>
          <p 
            className="text-[20px] font-semibold leading-tight mt-0.5"
            style={{ color: 'var(--color-text)' }}
          >
            Accelerator
          </p>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="spring text-[13px] font-medium px-3 py-2 rounded-[var(--radius-md)]"
            style={{ 
              color: 'var(--color-danger)',
              minHeight: 'var(--tap-min)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Start Fresh
          </button>
        )}
      </header>

      {/* Step Navigation */}
      {topNav && (
        <div 
          className="glass px-[var(--space-lg)] py-[var(--space-md)] border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="no-scrollbar overflow-x-auto -mx-1">{topNav}</div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className={`flex h-full flex-col gap-[var(--space-lg)] p-[var(--space-lg)] ${contentClassName}`}>
          {children}
        </div>
      </main>
    </div>
  );
};
