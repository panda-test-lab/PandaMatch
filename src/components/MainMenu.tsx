import React from 'react';
import { PlayerStats, CardSet } from '../types/memory';
import {
  LayoutGrid,
  BookOpen,
  Brain,
  PenTool,
  Layers,
  Edit3,
  Trophy,
  BarChart2,
  Play,
  ArrowRight,
  Flame,
  Award,
  CheckCircle2
} from 'lucide-react';

interface MainMenuProps {
  onStartClassicOriginal: () => void;
  onStartClassicExtended: () => void;
  onStartOpenLearning: () => void;
  onOpenRecall: () => void;
  onOpenDrawing: () => void;
  onOpenSets: () => void;
  onOpenEditor: () => void;
  onOpenLeaderboard: () => void;
  onOpenStats: () => void;
  stats: PlayerStats;
  allSets: CardSet[];
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartClassicOriginal,
  onStartClassicExtended,
  onStartOpenLearning,
  onOpenRecall,
  onOpenDrawing,
  onOpenSets,
  onOpenEditor,
  onOpenLeaderboard,
  onOpenStats,
  stats,
  allSets,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8 select-none">
      {/* Game Arcade Hero Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 border border-slate-300 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-xl overflow-hidden text-center flex flex-col items-center">
        {/* Decorative background glows */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Official PandaMatch Logo & Mascot Sticker */}
        <div className="mb-3 relative group">
          <img
            src="/assets/aistudio/PandaMatch__Sticker.png"
            alt="PandaMatch Sticker Logo"
            className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none drop-shadow-md"
          />
        </div>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Pauken war gestern! Hier fütterst du dein Gehirn spielerisch mit echten Fakten, bis selbst dein innerer Schweinehund staunt – rasant, frech und garantiert ohne Schnarch-Faktor.
        </p>

        {/* Quick KPI Stats Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Gespielt:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {stats.gamesPlayed} Runden
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Treffer:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {stats.totalMatches} Zuordnungen
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Verfügbar:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {allSets.length} Kartensets
            </span>
          </div>
        </div>
      </div>

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. KLASSISCHER MODUS */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Gedächtnis & Bestenliste
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Klassischer Modus
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Verdeckte Karten umdrehen und passende Assoziationen mit minimalen Zügen aufdecken.
            </p>
          </div>

          {/* Unterpunkte */}
          <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Unterpunkt 1: Original */}
            <button
              onClick={onStartClassicOriginal}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎴</span>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Original
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                1 Kartenpaar gehört zusammen (2 Karten pro Zug).
              </p>
            </button>

            {/* Unterpunkt 2: Erweitert */}
            <button
              onClick={onStartClassicExtended}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🃏</span>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Erweitert
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Farb-Rückseiten
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                3–4 Karten pro Konzept mit farbkodierten Rückseiten für gleichartige Eigenschaften.
              </p>
            </button>
          </div>
        </div>

        {/* 2. LERNMODUS */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                Offenes Zuordnen
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Lernmodus
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Alle Karten liegen offen vor dir. Finde zusammengehörige Paare und Eigenschaften ganz entspannt und ohne Zeitdruck.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onStartOpenLearning}
              className="w-full py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs transition-all cursor-pointer group"
            >
              <span>Lernrunde konfigurieren</span>
              <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 3. SELBSTABFRAGE */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Active Recall
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Selbstabfrage
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Gehirn anwerfen, blitzschnell die passende Antwortkarte wählen und dein Faktenwissen auf die Probe stellen!
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onOpenRecall}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs transition-all cursor-pointer group"
            >
              <span>Selbsttest starten</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 4. ZEICHENMODUS */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold shadow-xs">
                <PenTool className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                Freihand-Skizze
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Zeichenmodus
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Skizziere gesuchte Formen, Symbole oder Begriffe frei von Hand und vergleiche dein Werk direkt mit der Lösung.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onOpenDrawing}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-xs transition-all cursor-pointer group"
            >
              <span>Zeichenmodus starten</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 5. LERNKARTEN */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Sets & Editor
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Lernkarten
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Verwalte deine Lernsets oder erstelle eigene Multi-Eigenschaften-Sets mit Drag & Drop.
            </p>
          </div>

          {/* Unterpunkte */}
          <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Unterpunkt 1: Kartensets */}
            <button
              onClick={onOpenSets}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Kartensets
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Alle {allSets.length} Sets ansehen, filtern, durchsuchen und exportieren.
              </p>
            </button>

            {/* Unterpunkt 2: Set-Editor */}
            <button
              onClick={onOpenEditor}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Set-Editor
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Eigenes Set mit bis zu 4 Eigenschaften & Formel-Generator erstellen.
              </p>
            </button>
          </div>
        </div>

        {/* 6. WERTUNG */}
        <div className="rounded-3xl p-5 border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-yellow-100 dark:bg-yellow-950/80 text-yellow-700 dark:text-yellow-400 flex items-center justify-center font-bold shadow-xs">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                Highscores & Analytik
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Wertung
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Prüfe deine Rekorde in der Bestenliste und verfolge deine Behaltensleistung im Lernstatus.
            </p>
          </div>

          {/* Unterpunkte */}
          <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Unterpunkt 1: Bestenliste */}
            <button
              onClick={onOpenLeaderboard}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-yellow-500 hover:bg-yellow-50/40 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Bestenliste
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Lokale Rangliste mit Punkten, Zügen, Zeiten und Podestplätzen.
              </p>
            </button>

            {/* Unterpunkt 2: Lernstatus */}
            <button
              onClick={onOpenStats}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-slate-850 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Lernstatus
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Spaced Repetition: Sicher gelernt, unsicher oder wiederkehrende Fehler.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
