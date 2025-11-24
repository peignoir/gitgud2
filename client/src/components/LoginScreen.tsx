import React, { useState } from "react";

interface LoginScreenProps {
  onLogin: (userId: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = email.trim() || `guest-${Math.random().toString(36).slice(2, 7)}`;
    onLogin(id);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg-body text-text-primary pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-1 px-6 py-10">
        <div className="mx-auto flex h-full max-w-sm flex-col justify-center gap-10">
          <div className="space-y-3 text-left">
            <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">GitGud.vc</p>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Founder Console</h1>
            <p className="text-sm text-text-secondary">
              YC-style coaching in five short steps. Drop your handle to unlock the mobile stack.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="text-[10px] uppercase tracking-[0.3em] text-text-muted">Handle</label>
            <input
              type="text"
              placeholder="@founder"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand-primary py-3 text-base font-semibold text-text-inverse transition hover:bg-brand-primary-soft"
            >
              Enter studio
            </button>
          </form>

          <div className="text-xs text-text-muted uppercase tracking-[0.4em] text-center">
            No fluff · 9 days · 90 minutes
          </div>
        </div>
      </div>
    </div>
  );
};

