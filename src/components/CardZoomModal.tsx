import React, { useEffect } from 'react';
import { CardItem } from '../types/memory';
import { X } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

interface CardZoomModalProps {
  card: CardItem | null;
  onClose: () => void;
}

export const CardZoomModal: React.FC<CardZoomModalProps> = ({ card, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (card) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vergrößerte Karte"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center animate-scale-up"
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute -top-12 right-0 sm:-right-10 p-2 rounded-full text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer shadow-lg z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pure Magnified Card - Only the card content is displayed, NO extra info */}
        <div className="w-[85vw] max-w-[420px] aspect-square rounded-3xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-2xl flex items-center justify-center p-6 overflow-hidden">
          {card.type === 'emoji' && (
            <span className="text-8xl sm:text-9xl filter drop-shadow-md select-none">
              {card.content}
            </span>
          )}

          {card.type === 'image' && (
            <img
              src={card.content}
              alt={card.label || 'Vergrößerte Karte'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-2xl filter drop-shadow-md select-none"
            />
          )}

          {card.type === 'svg' && (
            <div
              className="w-full h-full flex items-center justify-center p-2 text-slate-950 dark:text-white"
              dangerouslySetInnerHTML={{ __html: card.content }}
            />
          )}

          {card.type === 'latex' && (
            <div className="w-full h-full p-4 text-center flex items-center justify-center text-slate-950 dark:text-white overflow-x-auto">
              <LatexRenderer latex={card.content} displayMode={true} className="text-2xl sm:text-3xl md:text-4xl" />
            </div>
          )}

          {card.type === 'text' && (
            <div className="w-full h-full p-4 text-center flex items-center justify-center">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-snug break-words hyphens-auto">
                {card.content}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
