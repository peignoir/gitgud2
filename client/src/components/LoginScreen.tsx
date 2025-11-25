import React, { useState } from "react";

interface LoginScreenProps {
  onLogin: (userId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [handle, setHandle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = handle.trim() || `founder-${Math.random().toString(36).slice(2, 7)}`;
    onLogin(id);
  };

  return (
    <div 
      className="flex min-h-dvh flex-col"
      style={{ 
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="flex-1 px-[var(--space-lg)] py-[var(--space-xl)]">
        <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-[var(--space-xl)]">
          
          {/* Logo / Title */}
          <div className="space-y-[var(--space-md)] text-center">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-lg)] mb-[var(--space-md)]"
              style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)' }}
            >
              <span className="text-2xl font-bold text-white">NC</span>
            </div>
            <h1 
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--color-text)' }}
            >
              NC/ACC Accelerator
            </h1>
            <p 
              className="text-[16px] leading-relaxed"
              style={{ color: 'var(--color-text-soft)' }}
            >
              AI-powered coaching from idea to launch. Deep research, creative ideation, and execution sprints.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
            <div className="space-y-[var(--space-sm)]">
              <label 
                className="text-[13px] font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Your handle or name
              </label>
              <input
                type="text"
                placeholder="@yourname"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-[var(--space-lg)] py-[var(--space-md)] text-[16px] rounded-[var(--radius-md)] border outline-none transition-all"
                style={{ 
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text)',
                  minHeight: 'var(--tap-min)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border-subtle)'}
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full text-[16px]"
            >
              Start Your Journey
            </button>
          </form>

          {/* Footer */}
          <div 
            className="text-[13px] text-center space-y-[var(--space-sm)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>Deep profile research · Creative ideation · 90-min sprints</p>
          </div>
        </div>
      </div>
    </div>
  );
};
