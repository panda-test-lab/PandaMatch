import React from 'react';
import {
  Home,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';

export type ActiveTab =
  | 'menu'
  | 'game'
  | 'recall'
  | 'drawing'
  | 'sets'
  | 'editor'
  | 'leaderboard'
  | 'stats';

interface NavbarProps {
  activeTab: ActiveTab;
  onGoHome: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
  onOpenTour?: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onGoHome,
  onGoBack,
  canGoBack,
  onOpenTour,
  theme,
  toggleTheme,
  isMuted,
  toggleMute,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-3 sm:px-6 h-16">
        {/* Left: Brand + Navigation Controls (Hauptmenü + Zurück) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Brand Logo (Navigates to Menu) */}
          <button
            onClick={onGoHome}
            aria-label="Zum Hauptmenü"
            className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1 -ml-1 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/assets/aistudio/PandaMatch__Sticker.png"
                alt="PandaMatch Sticker Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                PandaMatch
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase mt-0.5">
                Lernen. Zuordnen. Verstehen.
              </span>
            </div>
          </button>

          {/* Divider */}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Zurück zum Hauptmenü Button */}
          <button
            onClick={onGoHome}
            title="Zurück zum Hauptmenü"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Hauptmenü</span>
          </button>

          {/* Einen Bildschirm zurück Button */}
          {canGoBack && (
            <button
              onClick={onGoBack}
              title="Einen Bildschirm zurück"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
          )}
        </div>



        {/* Right: Info-Tour + Ton ein/aus + Hell/Dunkel */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Info-Tour Button */}
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              aria-label="Info-Tour & Modus-Erklärung starten"
              title="Info-Tour & Modus-Erklärung starten"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Info-Tour</span>
            </button>
          )}

          {/* Ton ein/aus */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Ton einschalten' : 'Ton stummschalten'}
            title={isMuted ? 'Ton einschalten' : 'Ton stummschalten'}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-rose-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          {/* Hell / Dunkel */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
            title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
