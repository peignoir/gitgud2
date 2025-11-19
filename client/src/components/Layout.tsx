import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  onReset?: () => void;
  step?: number;
  totalSteps?: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, onReset, step = 0, totalSteps = 5 }) => {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#0e111b] text-white font-mono overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e111b]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
          <span className="font-bold tracking-tight text-lg text-gray-100">
            GitGud.vc <span className="text-gray-500 text-xs font-normal">· v2</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              [RESET]
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {totalSteps > 0 && step > 0 && (
        <div className="w-full h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};

