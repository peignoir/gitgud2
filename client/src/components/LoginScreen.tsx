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
    <div className="min-h-dvh w-full flex flex-col items-center justify-center px-6 py-16 bg-white text-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <div className="text-6xl animate-bounce duration-[2000ms]">👋</div>
          <h1 className="text-4xl font-black tracking-tight">
            GitGud<span className="text-yellow-400">.vc</span>
          </h1>
          <p className="text-lg font-semibold text-gray-600">
            Your AI Co-Founder for World Domination
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-200"></div>
            <input
              type="text"
              placeholder="Enter your handle (e.g. @elon)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg font-semibold text-black placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white font-black text-xl py-4 rounded-2xl hover:scale-105 hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            LET'S GO 🚀
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-gray-500 uppercase tracking-[0.4em]">
          <span>YC</span>
          <span>STYLE</span>
          <span>•</span>
          <span>NO</span>
          <span>FLUFF</span>
          <span>•</span>
          <span>FAST</span>
        </div>

        <div className="text-xs text-gray-400 uppercase tracking-[0.4em]">
          System v2.0 · Built Different
        </div>
      </div>
    </div>
  );
};

