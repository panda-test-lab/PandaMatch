import React from 'react';
import { Heart } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { reportAppError } from '../utils/errorReporting';

interface KoFiButtonProps {
  className?: string;
  variant?: 'compact' | 'standard';
}

const KOFI_URL = 'https://ko-fi.com/H0G826CZMP';

export const KoFiButton: React.FC<KoFiButtonProps> = ({
  className = '',
  variant = 'standard',
}) => {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Unterstütze meine Arbeit auf Ko-fi"
      aria-label="Unterstütze meine Arbeit auf Ko-fi"
      onClick={(event) => {
        if (!isTauri()) return;
        event.preventDefault();
        void openUrl(KOFI_URL).catch((error: unknown) => {
          reportAppError(error, 'Ko-fi-Seite öffnen');
        });
      }}
      className={`inline-flex items-center gap-2 font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer select-none ${
        variant === 'compact'
          ? 'px-3 py-1.5 rounded-xl text-xs'
          : 'px-4 py-2 rounded-2xl text-xs sm:text-sm'
      } bg-[#ffaa00] hover:bg-[#ff9f00] text-slate-950 border border-amber-500/40 ${className}`}
    >
      {/* Ko-fi Cup Icon */}
      <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
        <Heart className="w-3 h-3 text-[#ff5e5b] fill-[#ff5e5b] animate-pulse" />
      </span>
      <span className="font-extrabold tracking-tight">Unterstütze meine Arbeit</span>
    </a>
  );
};
