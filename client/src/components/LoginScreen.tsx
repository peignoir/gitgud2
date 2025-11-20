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
    <div className="flex flex-col items-center justify-center h-full px-6 animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-yellow-400 mb-8 shadow-[0_0_20px_rgba(250,204,21,0.3)]" />
      <h1 className="text-3xl font-bold mb-2 text-center">GitGud Accelerator</h1>
      <p className="text-gray-400 text-center mb-10 max-w-xs text-sm leading-relaxed">
        The AI-powered vibecelerator for solo founders from idea to funding in nine days and ninety minutes. 
</p>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <input
            type="text"
            placeholder="Enter your handle or email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition-colors"
        >
          Start Journey &rarr;
        </button>
      </form>
      
      <div className="mt-8 text-xs text-gray-600 font-mono">
        System v2.0 · Powered by OpenAI Agents
      </div>
    </div>
  );
};

