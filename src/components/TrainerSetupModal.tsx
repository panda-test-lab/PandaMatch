import React, { useState } from 'react';
import { CardSet } from '../types/memory';
import { X, Play, Search, Brain, PenTool } from 'lucide-react';
import { canUseDrawingMode } from '../utils/drawingMode';

interface TrainerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'recall' | 'drawing';
  allSets: CardSet[];
  onStartTrainer: (cardSet: CardSet) => void;
}

export const TrainerSetupModal: React.FC<TrainerSetupModalProps> = ({
  isOpen,
  onClose,
  mode,
  allSets,
  onStartTrainer,
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(allSets[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const isRecall = mode === 'recall';
  const eligibleSets = isRecall ? allSets : allSets.filter(canUseDrawingMode);
  const filteredSets = eligibleSets.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const selectedSet = eligibleSets.find((s) => s.id === selectedSetId) || eligibleSets[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
              isRecall ? 'bg-indigo-600' : 'bg-teal-600'
            }`}>
              {isRecall ? <Brain className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {isRecall ? 'Selbstabfrage (Active Recall) starten' : 'Zeichenmodus (Skizze) starten'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRecall
                  ? 'Wähle das Kartenset aus, mit dem du trainieren möchtest.'
                  : 'Nur Sets mit visuellen Struktur- oder Darstellungsangaben können gezeichnet werden.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Schließen"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kartenset suchen..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredSets.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                {isRecall
                  ? eligibleSets.length === 0
                    ? 'Es gibt noch keine Kartensets. Erstelle oder importiere zuerst ein Set.'
                    : 'Keine passenden Kartensets gefunden.'
                  : eligibleSets.length === 0
                    ? 'Es gibt noch kein Set mit einer zeichnungsgeeigneten Darstellung. Benenne eine Eigenschaft zum Beispiel „Strukturformel“, „Skizze“ oder „Darstellung“.'
                    : 'Keine passenden Kartensets gefunden.'}
              </p>
            )}
            {filteredSets.map((s) => {
              const isSelected = s.id === selectedSetId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSetId(s.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-slate-950 dark:text-white ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span className="text-2xl shrink-0 select-none">{s.icon || '🎴'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-xs sm:text-sm truncate">{s.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{s.category}</span>
                      <span>·</span>
                      <span className="font-mono">{s.pairs.length} Paare</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedSet) {
                onStartTrainer(selectedSet);
                onClose();
              }
            }}
            disabled={!selectedSet}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRecall ? 'Selbstabfrage starten' : 'Zeichenmodus starten'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
