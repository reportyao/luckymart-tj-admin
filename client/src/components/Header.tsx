import React from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header: React.FC = () => {
  return (
    <header className="tez-gradient-green sticky top-0 z-40">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          {/* TezBarakat Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">TezBarakat</span>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
};
