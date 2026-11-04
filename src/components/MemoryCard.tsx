import React, { useState, useRef, useEffect } from 'react';
import { CardItem, GameVariant } from '../types/memory';
import { Sparkles, Check, ZoomIn } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

// Distinct colored accents on the card BACK & FRONT (used in Extended Classic Mode with 3+ properties)
export const BACK_COLOR_THEMES = [
  // 0: Emerald (e.g. Strukturformel / Bild)
  {
    bg: 'from-emerald-500/25 via-emerald-600/15 to-teal-700/25 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-teal-950',
    border: 'border-emerald-500 dark:border-emerald-400',
    dashed: 'border-emerald-400 dark:border-emerald-500',
    iconBox: 'bg-emerald-100 dark:bg-emerald-900/80 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-800 dark:text-emerald-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-emerald-200/90 via-emerald-100/95 to-teal-200/90 dark:from-emerald-950 dark:via-emerald-900/90 dark:to-teal-950',
    frontBorder: 'border-4 border-emerald-600 dark:border-emerald-400',
    frontGlow: 'shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/40',
    accentBar: 'bg-emerald-500 dark:bg-emerald-400',
    badge: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950',
    textColor: 'text-emerald-950 dark:text-emerald-100 font-extrabold',
  },
  // 1: Sky / Blue (e.g. Wirkstoffname)
  {
    bg: 'from-sky-500/25 via-sky-600/15 to-blue-700/25 dark:from-sky-950 dark:via-sky-900/60 dark:to-blue-950',
    border: 'border-sky-500 dark:border-sky-400',
    dashed: 'border-sky-400 dark:border-sky-500',
    iconBox: 'bg-sky-100 dark:bg-sky-900/80 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300',
    text: 'text-sky-800 dark:text-sky-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-sky-200/90 via-sky-100/95 to-blue-200/90 dark:from-sky-950 dark:via-sky-900/90 dark:to-blue-950',
    frontBorder: 'border-4 border-sky-600 dark:border-sky-400',
    frontGlow: 'shadow-lg shadow-sky-500/30 ring-2 ring-sky-500/40',
    accentBar: 'bg-sky-500 dark:bg-sky-400',
    badge: 'bg-sky-600 text-white dark:bg-sky-500 dark:text-slate-950',
    textColor: 'text-sky-950 dark:text-sky-100 font-extrabold',
  },
  // 2: Violet / Purple (e.g. Formel / Botanischer Name)
  {
    bg: 'from-purple-500/25 via-purple-600/15 to-fuchsia-700/25 dark:from-purple-950 dark:via-purple-900/60 dark:to-fuchsia-950',
    border: 'border-purple-500 dark:border-purple-400',
    dashed: 'border-purple-400 dark:border-purple-500',
    iconBox: 'bg-purple-100 dark:bg-purple-900/80 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300',
    text: 'text-purple-800 dark:text-purple-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-purple-200/90 via-purple-100/95 to-fuchsia-200/90 dark:from-purple-950 dark:via-purple-900/90 dark:to-fuchsia-950',
    frontBorder: 'border-4 border-purple-600 dark:border-purple-400',
    frontGlow: 'shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/40',
    accentBar: 'bg-purple-500 dark:bg-purple-400',
    badge: 'bg-purple-600 text-white dark:bg-purple-500 dark:text-slate-950',
    textColor: 'text-purple-950 dark:text-purple-100 font-extrabold',
  },
  // 3: Amber / Orange (e.g. Klasse / Indikation)
  {
    bg: 'from-amber-500/25 via-amber-600/15 to-orange-700/25 dark:from-amber-950 dark:via-amber-900/60 dark:to-orange-950',
    border: 'border-amber-500 dark:border-amber-400',
    dashed: 'border-amber-400 dark:border-amber-500',
    iconBox: 'bg-amber-100 dark:bg-amber-900/80 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300',
    text: 'text-amber-800 dark:text-amber-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-amber-200/90 via-amber-100/95 to-orange-200/90 dark:from-amber-950 dark:via-amber-900/90 dark:to-orange-950',
    frontBorder: 'border-4 border-amber-600 dark:border-amber-400',
    frontGlow: 'shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/40',
    accentBar: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950',
    textColor: 'text-amber-950 dark:text-amber-100 font-extrabold',
  },
  // 4: Rose / Pink
  {
    bg: 'from-rose-500/25 via-rose-600/15 to-pink-700/25 dark:from-rose-950 dark:via-rose-900/60 dark:to-pink-950',
    border: 'border-rose-500 dark:border-rose-400',
    dashed: 'border-rose-400 dark:border-rose-500',
    iconBox: 'bg-rose-100 dark:bg-rose-900/80 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300',
    text: 'text-rose-800 dark:text-rose-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-rose-200/90 via-rose-100/95 to-pink-200/90 dark:from-rose-950 dark:via-rose-900/90 dark:to-pink-950',
    frontBorder: 'border-4 border-rose-600 dark:border-rose-400',
    frontGlow: 'shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/40',
    accentBar: 'bg-rose-500 dark:bg-rose-400',
    badge: 'bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950',
    textColor: 'text-rose-950 dark:text-rose-100 font-extrabold',
  },
  // 5: Teal / Cyan
  {
    bg: 'from-teal-500/25 via-teal-600/15 to-cyan-700/25 dark:from-teal-950 dark:via-teal-900/60 dark:to-cyan-950',
    border: 'border-teal-500 dark:border-teal-400',
    dashed: 'border-teal-400 dark:border-teal-500',
    iconBox: 'bg-teal-100 dark:bg-teal-900/80 border-teal-400 dark:border-teal-600 text-teal-700 dark:text-teal-300',
    text: 'text-teal-800 dark:text-teal-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-teal-200/90 via-teal-100/95 to-cyan-200/90 dark:from-teal-950 dark:via-teal-900/90 dark:to-cyan-950',
    frontBorder: 'border-4 border-teal-600 dark:border-teal-400',
    frontGlow: 'shadow-lg shadow-teal-500/30 ring-2 ring-teal-500/40',
    accentBar: 'bg-teal-500 dark:bg-teal-400',
    badge: 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950',
    textColor: 'text-teal-950 dark:text-teal-100 font-extrabold',
  },
  // 6: Indigo
  {
    bg: 'from-indigo-500/25 via-indigo-600/15 to-blue-700/25 dark:from-indigo-950 dark:via-indigo-900/60 dark:to-blue-950',
    border: 'border-indigo-500 dark:border-indigo-400',
    dashed: 'border-indigo-400 dark:border-indigo-500',
    iconBox: 'bg-indigo-100 dark:bg-indigo-900/80 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300',
    text: 'text-indigo-800 dark:text-indigo-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-indigo-200/90 via-indigo-100/95 to-blue-200/90 dark:from-indigo-950 dark:via-indigo-900/90 dark:to-blue-950',
    frontBorder: 'border-4 border-indigo-600 dark:border-indigo-400',
    frontGlow: 'shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/40',
    accentBar: 'bg-indigo-500 dark:bg-indigo-400',
    badge: 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950',
    textColor: 'text-indigo-950 dark:text-indigo-100 font-extrabold',
  },
  // 7: Orange / Coral
  {
    bg: 'from-orange-500/25 via-orange-600/15 to-amber-700/25 dark:from-orange-950 dark:via-orange-900/60 dark:to-amber-950',
    border: 'border-orange-500 dark:border-orange-400',
    dashed: 'border-orange-400 dark:border-orange-500',
    iconBox: 'bg-orange-100 dark:bg-orange-900/80 border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-300',
    text: 'text-orange-800 dark:text-orange-300',
    // High-visibility front face
    frontBg: 'bg-gradient-to-br from-orange-200/90 via-orange-100/95 to-amber-200/90 dark:from-orange-950 dark:via-orange-900/90 dark:to-amber-950',
    frontBorder: 'border-4 border-orange-600 dark:border-orange-400',
    frontGlow: 'shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/40',
    accentBar: 'bg-orange-500 dark:bg-orange-400',
    badge: 'bg-orange-600 text-white dark:bg-orange-500 dark:text-slate-950',
    textColor: 'text-orange-950 dark:text-orange-100 font-extrabold',
  },
];

// Subtle fallback themes for property groups in 2-property classic mode
export const PROPERTY_FRONT_THEMES = [
  {
    bg: 'bg-emerald-500/5 dark:bg-emerald-950/30',
    border: 'border-emerald-500/40 dark:border-emerald-700/50',
    badge: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
  },
  {
    bg: 'bg-sky-500/5 dark:bg-sky-950/30',
    border: 'border-sky-500/40 dark:border-sky-700/50',
    badge: 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800',
  },
  {
    bg: 'bg-purple-500/5 dark:bg-purple-950/30',
    border: 'border-purple-500/40 dark:border-purple-700/50',
    badge: 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
  },
  {
    bg: 'bg-amber-500/5 dark:bg-amber-950/30',
    border: 'border-amber-500/40 dark:border-amber-700/50',
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
  },
  {
    bg: 'bg-rose-500/5 dark:bg-rose-950/30',
    border: 'border-rose-500/40 dark:border-rose-700/50',
    badge: 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  },
  {
    bg: 'bg-teal-500/5 dark:bg-teal-950/30',
    border: 'border-teal-500/40 dark:border-teal-700/50',
    badge: 'bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-800',
  },
  {
    bg: 'bg-indigo-500/5 dark:bg-indigo-950/30',
    border: 'border-indigo-500/40 dark:border-indigo-700/50',
    badge: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800',
  },
  {
    bg: 'bg-orange-500/5 dark:bg-orange-950/30',
    border: 'border-orange-500/40 dark:border-orange-700/50',
    badge: 'bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
  },
];

interface MemoryCardProps {
  card: CardItem;
  onClick: () => void;
  onZoom: (card: CardItem) => void;
  disabled: boolean;
  theme: 'light' | 'dark';
  isOpenMode?: boolean;
  gameVariant?: GameVariant;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  card,
  onClick,
  onZoom,
  disabled,
  isOpenMode = false,
  gameVariant = 'open',
}) => {
  const isRevealed = isOpenMode || card.isFlipped || card.isMatched || card.isPeeked;

  // 3-second hover zoom state
  const [hoverProgress, setHoverProgress] = useState(0);
  const hoverTimerRef = useRef<number | null>(null);
  const hoverIntervalRef = useRef<number | null>(null);

  // Touch long-press state
  const touchTimerRef = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hoverIntervalRef.current) clearInterval(hoverIntervalRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  // Handle Mouse Enter for 3-Second Hover Zoom
  const handleMouseEnter = () => {
    if (!isRevealed) return;

    const startTime = Date.now();
    const duration = 3000;

    hoverIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoverProgress(progress);
    }, 50);

    hoverTimerRef.current = window.setTimeout(() => {
      setHoverProgress(0);
      if (hoverIntervalRef.current) clearInterval(hoverIntervalRef.current);
      onZoom(card);
    }, duration);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (hoverIntervalRef.current) clearInterval(hoverIntervalRef.current);
    setHoverProgress(0);
  };

  // Handle Touch Screen Long-Press
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRevealed) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    touchTimerRef.current = window.setTimeout(() => {
      onZoom(card);
    }, 700);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchStartPos.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && (!isRevealed || isOpenMode) && !card.isMatched) {
      e.preventDefault();
      onClick();
    }
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      onZoom(card);
    }
  };

  // Property-based front styling
  const propIndex = card.propertyColorIndex !== undefined ? card.propertyColorIndex : 0;
  const propTheme = PROPERTY_FRONT_THEMES[propIndex % PROPERTY_FRONT_THEMES.length];

  // Card back styling:
  // ONLY in Extended mode (3+ properties), cards get distinct color themes
  const isExtendedMode = gameVariant === 'extended';
  const backTheme = isExtendedMode && card.propertyColorIndex !== undefined
    ? BACK_COLOR_THEMES[card.propertyColorIndex % BACK_COLOR_THEMES.length]
    : null;

  // Ultra-fine dynamic font sizing based strictly on text character count to prevent any clipping on small cards
  const getTextSizeClass = (text: string) => {
    const len = text.trim().length;
    if (len <= 10) return 'font-extrabold';
    if (len <= 45) return 'font-bold';
    return 'font-semibold';
  };

  // Determine front background & border styling:
  // In Extended mode, revealed cards take the distinct, prominent color gradient of their back side!
  const getFrontCardStyle = () => {
    if (card.isOutlierMismatch) {
      return 'border-4 border-rose-600 ring-4 ring-rose-500/80 bg-rose-50 dark:bg-rose-950/90 shadow-lg animate-shake';
    }
    if (card.isMismatchAnim) {
      return 'border-4 border-rose-600 ring-4 ring-rose-500/60 bg-rose-50 dark:bg-rose-950/80 shadow-md animate-shake';
    }
    if (card.isPeeked) {
      return 'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/60';
    }

    if (backTheme) {
      // Extended mode: Card front matches the back color with vivid saturation!
      if (card.isMatched) {
        return `border-4 border-emerald-500/90 ring-2 ring-emerald-500/30 ${backTheme.frontBg} shadow-xs`;
      }
      if (card.isSelected) {
        return `${backTheme.frontBorder} ring-4 ring-emerald-500/80 ${backTheme.frontBg} ${backTheme.frontGlow}`;
      }
      return `${backTheme.frontBorder} ${backTheme.frontBg} ${backTheme.frontGlow}`;
    }

    // Classic original or standard front styling
    if (card.isMatched) {
      return 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 shadow-xs';
    }
    if (card.isSelected) {
      return 'border-emerald-500 ring-4 ring-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60 shadow-md';
    }
    return `${propTheme.border} ${propTheme.bg} bg-slate-50 dark:bg-slate-900 shadow-md`;
  };

  return (
    <div
      role="button"
      tabIndex={card.isMatched ? -1 : 0}
      aria-label={isRevealed ? (card.label || 'Karte') : 'Verdeckte Memory-Karte'}
      aria-pressed={isRevealed || card.isSelected}
      onClick={() => {
        handleMouseLeave();
        if (!disabled && !card.isMatched) {
          onClick();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className={`memory-card-frame group relative w-full aspect-square min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl select-none ${
        card.isMatched
          ? 'cursor-default opacity-90'
          : card.isSelected
          ? 'scale-[1.03] ring-3 ring-emerald-500 shadow-md'
          : disabled
          ? 'cursor-not-allowed'
          : 'hover:scale-[1.02] active:scale-[0.98]'
      } ${card.isMismatchAnim ? 'animate-shake' : ''} transition-all duration-150`}
    >
      {/* 3-Second Hover Progress Indicator */}
      {hoverProgress > 0 && isRevealed && !card.isMatched && (
        <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full border border-white/40 border-t-emerald-400 animate-spin" />
          <span>Zoom {Math.round(hoverProgress / 33)}s</span>
        </div>
      )}

      {/* Manual Zoom Icon Button (Visible on hover or touch) */}
      {isRevealed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(card);
          }}
          title="Karte vergrößern"
          aria-label="Karte vergrößern"
          className="absolute top-2 right-2 z-20 w-6 h-6 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-xs cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      )}

      {/* CARD BACK (HIDDEN FACE - Rendered ONLY when NOT revealed in classic mode) */}
      {!isRevealed && (
        <div
          className={`w-full h-full rounded-2xl border transition-all overflow-hidden flex flex-col items-center justify-between p-1 sm:p-3 shadow-sm group-hover:shadow-md ${
            backTheme
              ? `${backTheme.border} bg-gradient-to-br ${backTheme.bg}`
              : 'border-slate-300 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950'
          }`}
        >
          <div
            className={`absolute inset-2 rounded-xl border border-dashed pointer-events-none ${
              backTheme ? backTheme.dashed : 'border-slate-300/80 dark:border-slate-700/60'
            }`}
          />

          <div className="h-2" />

          {/* Center Emblem */}
          <div
            className={`relative z-10 w-5 h-5 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl border flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform ${
              backTheme
                ? backTheme.iconBox
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-emerald-500 dark:text-emerald-400'
            }`}
          >
            <Sparkles className="w-3 h-3 sm:w-6 sm:h-6 opacity-85" />
          </div>

          <span
            className={`relative z-10 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
              backTheme ? backTheme.text : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {backTheme ? `Typ ${(card.propertyColorIndex || 0) + 1}` : 'Memo'}
          </span>
        </div>
      )}

      {/* CARD FRONT (REVEALED FACE - Rendered ONLY when revealed or in open mode) */}
      {isRevealed && (
        <div
          className={`w-full h-full rounded-2xl flex flex-col items-center justify-between p-1 sm:p-2 text-center transition-all overflow-hidden relative ${getFrontCardStyle()}`}
        >
          {/* In Extended mode: Top colored accent bar so the color category is immediately prominent */}
          {backTheme && (
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${backTheme.accentBar}`} />
          )}

          {/* Match status */}
          {card.isMatched && (
            <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}

          {/* In Extended mode: Small property type badge in the top right corner */}
          {backTheme && !card.isOutlierMismatch && !card.isMismatchAnim && (
            <div className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide shadow-xs ${backTheme.badge}`}>
              Typ {(card.propertyColorIndex || 0) + 1}
            </div>
          )}

          {/* Main Visual Content (Single aspect only: text, LaTeX, SVG, image, or emoji - NO chips, NO footer) */}
          <div className="w-full h-full flex items-center justify-center p-1 text-center overflow-hidden">
            {card.type === 'emoji' && (
              <span className="text-4xl sm:text-5xl md:text-6xl filter drop-shadow-xs select-none" style={{ fontSize: 'clamp(1rem, 55cqi, 4rem)' }}>
                {card.content}
              </span>
            )}

            {card.type === 'image' && (
              <div className="w-full h-full flex items-center justify-center p-0.5">
                <img
                  src={card.content}
                  alt="Karte"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-lg filter drop-shadow-xs select-none"
                />
              </div>
            )}

            {card.type === 'svg' && (
              <div
                className="memory-card-svg w-full h-full flex items-center justify-center p-0.5"
                dangerouslySetInnerHTML={{ __html: card.content }}
              />
            )}

            {card.type === 'latex' && (
              <div className="w-full h-full flex items-center justify-center p-1 text-center overflow-hidden">
                <LatexRenderer latex={card.content} displayMode={true} className="text-[10px] sm:text-xs max-w-full overflow-hidden" />
              </div>
            )}

            {card.type === 'text' && (
              <div className="w-full h-full flex items-center justify-center p-0.5 text-center overflow-hidden">
                <span
                  className={`text-[10px] sm:text-xs ${getTextSizeClass(card.content)} ${backTheme ? backTheme.textColor : 'text-slate-950 dark:text-white'} break-words hyphens-auto w-full px-0.5`}
                  style={{
                    fontSize: `clamp(0.35rem, min(11cqi, ${100 / Math.max(1, Math.ceil(card.content.trim().length / 12))}cqb), 1.25rem)`,
                    lineHeight: 1.05,
                  }}
                >
                  {card.content}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
