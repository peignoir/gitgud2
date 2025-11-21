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
    <div className="flex flex-col items-center justify-center h-full px-6 animate-in fade-in duration-500 bg-white text-black">
      <div className="w-full max-w-md space-y-8 text-center">
        
        <div className="space-y-2">
          <div className="text-6xl animate-bounce duration-[2000ms]">👋</div>
          <h1 className="text-4xl font-black tracking-tighter">
            GitGud<span className="text-yellow-400">.vc</span>
          </h1>
          <p className="text-lg font-medium text-gray-500">
            Your AI Co-Founder for World Domination
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
            <input
              type="text"
              placeholder="Enter your handle (e.g. @elon)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative w-full bg-white border-2 border-gray-100 rounded-lg px-6 py-4 text-lg font-bold text-black placeholder-gray-300 focus:outline-none focus:border-yellow-400 transition-all"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-black text-white font-black text-xl py-4 rounded-lg hover:scale-105 hover:shadow-xl transition-all duration-200 active:scale-95"
          >
            LET'S GO 🚀
          </button>
        </form>
        
        <div className="flex items-center justify-center gap-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
          <span>YC Style</span>
          <span>•</span>
          <span>No Fluff</span>
          <span>•</span>
          <span>Fast</span>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-[10px] font-mono text-gray-300 uppercase">
        System v2.0 · Built different
      </div>
    </div>
  );
};

