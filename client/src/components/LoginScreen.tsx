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
      <div className="flex-1 px-5 py-6">
        <div className="mx-auto flex h-full max-w-sm flex-col justify-between">
          {/* Top intro */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-black flex items-center justify-center">
                <span className="text-[15px] font-semibold text-white">NC</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-gray-900">NC Mentor</span>
                <span className="text-[13px] text-gray-500">Founder coaching, right on your phone.</span>
              </div>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-[var(--space-lg)]">
            <div className="space-y-2 pt-6">
              <label 
                className="text-[13px] font-medium text-gray-500"
              >
                Your name or handle
              </label>
              <input
                type="text"
                placeholder="Franck, @franck, etc."
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3 py-3 text-[16px] rounded-2xl border outline-none transition-all bg-[#F2F2F7] border-transparent"
                style={{ 
                  color: '#111827',
                  minHeight: 'var(--tap-min)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0A84FF';
                  e.target.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent';
                  e.target.style.backgroundColor = '#F2F2F7';
                }}
              />
            </div>
            
            <button
              type="submit"
              className="w-full text-[16px] font-medium rounded-full py-3 bg-black text-white mt-2"
            >
              Start chatting
            </button>
          </form>
          </div>

          {/* Footer */}
          <div className="pb-4 pt-8 text-center text-[12px] text-gray-400">
            <p>Deep profile, ideas, sprints & a YC-style console.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
