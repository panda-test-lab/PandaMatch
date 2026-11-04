import React from 'react';
import { Heart } from 'lucide-react';

interface KoFiButtonProps {
  className?: string;
  variant?: 'compact' | 'standard';
}

export const KoFiButton: React.FC<KoFiButtonProps> = ({
  className = '',
  variant = 'standard',
}) => {
  return (
    <a
      href="https://ko-fi.com/H0G826CZMP"
      target="_blank"
      rel="noopener noreferrer"
      title="Unterstütze meine Arbeit auf Ko-fi"
      aria-label="Unterstütze meine Arbeit auf Ko-fi"
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
