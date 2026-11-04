import React, { useState, useMemo, useEffect } from 'react';
import { CardSet, GameMode, GameVariant, BoardDisplayMode } from '../types/memory';
import { computeSetsPropertyIntersection, createPooledCardSet } from '../utils/setCombination';
import { BACK_COLOR_THEMES, PROPERTY_FRONT_THEMES } from './MemoryCard';
import {
  X,
  Play,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  Users,
  User,
  SlidersHorizontal,
  Info,
  Dice5,
  Eye,
  LayoutGrid
} from 'lucide-react';

export interface GameSetupConfig {
  mode: 'classic-original' | 'classic-extended' | 'open';
}

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GameSetupConfig | null;
  allSets: CardSet[];
  activeSet: CardSet;
  onStartGame: (params: {
    cardSet: CardSet;
    pairsCount: number;
    activeProperties: string[];
    boardDisplayMode: BoardDisplayMode;
    gameVariant: GameVariant;
    gameMode: GameMode;
    versusPlayer1Name?: string;
    versusPlayer2Name?: string;
  }) => void;
}

interface GameSetupModalContentProps {
  onClose: () => void;
  config: GameSetupConfig;
  allSets: CardSet[];
  activeSet: CardSet;
  onStartGame: (params: {
    cardSet: CardSet;
    pairsCount: number;
    activeProperties: string[];
    boardDisplayMode: BoardDisplayMode;
    gameVariant: GameVariant;
    gameMode: GameMode;
    versusPlayer1Name?: string;
    versusPlayer2Name?: string;
  }) => void;
}

const GameSetupModalContent: React.FC<GameSetupModalContentProps> = ({
  onClose,
  config,
  allSets,
  activeSet,
  onStartGame,
}) => {
  const isOriginal = config.mode === 'classic-original';
  const isExtended = config.mode === 'classic-extended';
  const isOpenMode = config.mode === 'open';

  // Set selection state
  // Can be 'single', 'multi', or 'random-all'
  const [setSelectionType, setSetSelectionType] = useState<'single' | 'multi' | 'random-all'>(
    'single'
  );
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([activeSet.id]);

  // Player mode: Solo or Duell
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [player1Name, setPlayer1Name] = useState<string>('Spieler 1');
  const [player2Name, setPlayer2Name] = useState<string>('Spieler 2');

  // Currently selected CardSet objects
  const selectedSets = useMemo(() => {
    if (setSelectionType === 'random-all') {
      return allSets;
    }
    const filtered = allSets.filter((s) => selectedSetIds.includes(s.id));
    return filtered.length > 0 ? filtered : [allSets[0]];
  }, [setSelectionType, selectedSetIds, allSets]);

  // Compute common property intersection
  const { allProperties, sharedProperties } = useMemo(() => {
    return computeSetsPropertyIntersection(selectedSets);
  }, [selectedSets]);

  // Selected property keys to query
  const [selectedProps, setSelectedProps] = useState<string[]>(() => {
    if (isOriginal) {
      return sharedProperties.slice(0, 2).map((p) => p.key);
    }
    if (isExtended) {
      // In extended mode, default to all shared properties (or min 3)
      return sharedProperties.map((p) => p.key);
    }
    return sharedProperties.slice(0, Math.min(3, sharedProperties.length)).map((p) => p.key);
  });

  // Keep valid selected properties aligned with sharedProperties of selected sets without overriding user deselection
  const validSelectedProps = useMemo(() => {
    const sharedKeys = new Set(sharedProperties.map((p) => p.key));
    return selectedProps.filter((k) => sharedKeys.has(k));
  }, [selectedProps, sharedProperties]);

  // If set selection changed such that NONE of the chosen properties exist anymore, reset to mode defaults
  useEffect(() => {
    const sharedKeys = new Set(sharedProperties.map((p) => p.key));
    const stillValid = selectedProps.filter((k) => sharedKeys.has(k));

    if (stillValid.length === 0 && sharedProperties.length > 0) {
      if (isOriginal) {
        setSelectedProps(sharedProperties.slice(0, 2).map((p) => p.key));
      } else if (isExtended) {
        setSelectedProps(sharedProperties.map((p) => p.key));
      } else {
        setSelectedProps(sharedProperties.slice(0, Math.min(3, sharedProperties.length)).map((p) => p.key));
      }
    }
  }, [sharedProperties, isOriginal, isExtended]);

  // Total available pairs across selected sets
  const totalAvailablePairs = useMemo(() => {
    let count = 0;
    selectedSets.forEach((s) => {
      count += s.pairs.length;
    });
    return count;
  }, [selectedSets]);

  // Pair count options
  const pairCountOptions = useMemo(() => {
    const defaults = [4, 6, 8, 12, 16];
    const filtered = defaults.filter((n) => n <= totalAvailablePairs);
    if (!filtered.includes(totalAvailablePairs) && totalAvailablePairs > 2) {
      filtered.push(totalAvailablePairs);
    }
    filtered.sort((a, b) => a - b);
    return filtered.length > 0 ? filtered : [Math.min(6, totalAvailablePairs)];
  }, [totalAvailablePairs]);

  const [pairsCount, setPairsCount] = useState<number>(() => {
    if (pairCountOptions.includes(8)) return 8;
    if (pairCountOptions.includes(6)) return 6;
    return pairCountOptions[0] || 6;
  });

  // Ensure pairsCount is within bounds when options change
  const currentPairsCount = Math.min(pairsCount, totalAvailablePairs);

  const toggleSetId = (setId: string) => {
    if (setSelectionType === 'single') {
      setSelectedSetIds([setId]);
    } else {
      setSelectedSetIds((prev) => {
        if (prev.includes(setId)) {
          if (prev.length <= 1) return prev; // Keep at least one
          return prev.filter((id) => id !== setId);
        } else {
          return [...prev, setId];
        }
      });
    }
  };

  // Pure, direct on/off toggle for properties without shifting or displacement
  const handleToggleProperty = (propKey: string) => {
    setSelectedProps((prev) => {
      const current = prev.filter((k) => sharedProperties.some((p) => p.key === k));
      if (current.includes(propKey)) {
        // Simple deselect
        return current.filter((k) => k !== propKey);
      } else {
        // Simple select
        return [...current, propKey];
      }
    });
  };

  const handleSelectAllSharedProps = () => {
    setSelectedProps(sharedProperties.map((p) => p.key));
  };

  const handleClearSelectedProps = () => {
    setSelectedProps([]);
  };

  const handleResetClassicProps = () => {
    setSelectedProps(sharedProperties.slice(0, 2).map((p) => p.key));
  };

  // Validation rules for starting the game
  const isSelectionValid = isOriginal
    ? validSelectedProps.length === 2
    : isExtended
    ? validSelectedProps.length >= 3 && validSelectedProps.length <= sharedProperties.length
    : validSelectedProps.length >= 2;

  const handleStart = () => {
    if (!isSelectionValid) return;

    const pooledSet = createPooledCardSet(
      selectedSets,
      setSelectionType === 'random-all'
        ? 'Alle Sets (Zufall)'
        : selectedSets.length > 1
        ? `Kombiniert (${selectedSets.length} Sets)`
        : selectedSets[0].title
    );

    const boardDisplayMode: BoardDisplayMode = isOpenMode ? 'open' : 'classic';
    const gameVariant: GameVariant = isOriginal ? 'original' : isExtended ? 'extended' : 'open';

    onStartGame({
      cardSet: pooledSet,
      pairsCount: currentPairsCount,
      activeProperties: validSelectedProps,
      boardDisplayMode,
      gameVariant,
      gameMode,
      versusPlayer1Name: player1Name.trim() || 'Spieler 1',
      versusPlayer2Name: player2Name.trim() || 'Spieler 2',
    });
  };

  const cardsPerTurn = Math.max(1, validSelectedProps.length);
  const totalCardsOnBoard = currentPairsCount * cardsPerTurn;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                isOriginal
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : isExtended
                  ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500'
                  : 'bg-gradient-to-tr from-cyan-600 to-blue-500'
              }`}
            >
              {isOriginal ? (
                <LayoutGrid className="w-5 h-5" />
              ) : isExtended ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {isOriginal && 'Klassischer Modus · Original'}
                {isExtended && 'Klassischer Modus · Erweitert'}
                {isOpenMode && 'Lernmodus · Offene Zuordnung'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isOriginal && 'Klassisches Paar-Memory (2 Karten pro Zug, verdeckt)'}
                {isExtended && 'Multi-Karten-Memory mit farbkodierten Kartenrückseiten'}
                {isOpenMode && 'Alle Karten aufgedeckt · Wissenschaftlich verknüpfen'}
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 text-xs sm:text-sm">
          {/* SECTION 1: Kartensets wählen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>1. Kartenset-Auswahl</span>
              </label>

              {/* Set Selection Mode Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSetSelectionType('single');
                    setSelectedSetIds([selectedSetIds[0] || allSets[0].id]);
                  }}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    setSelectionType === 'single'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  Einzelnes Set
                </button>
                <button
                  type="button"
                  onClick={() => setSetSelectionType('multi')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    setSelectionType === 'multi'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  Mehrere Sets
                </button>
                <button
                  type="button"
                  onClick={() => setSetSelectionType('random-all')}
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                    setSelectionType === 'random-all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Zufall (Alle)</span>
                </button>
              </div>
            </div>

            {/* Sets Pills / Badges Grid */}
            {setSelectionType !== 'random-all' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                {allSets.map((s) => {
                  const isChecked = selectedSetIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSetId(s.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/70 text-slate-950 dark:text-white ring-1 ring-emerald-500 shadow-xs'
                          : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <span className="text-xl shrink-0 select-none">{s.icon || '🎴'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-xs truncate">{s.title}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{s.category}</span>
                          <span>·</span>
                          <span className="font-mono">{s.pairs.length} Paare</span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                <Dice5 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold">Zufallspool aktiv:</span> Karten werden dynamisch aus allen {allSets.length} verfügbaren Sets gemischt ({totalAvailablePairs} Paare insgesamt).
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Anzahl der Paare / Konzepte */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                <span>2. Anzahl der Paare / Konzepte ({currentPairsCount} Paare)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {totalCardsOnBoard} Karten auf dem Brett
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {pairCountOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPairsCount(n)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    currentPairsCount === n
                      ? 'border-emerald-500 bg-emerald-600 text-white font-extrabold shadow-sm'
                      : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold'
                  }`}
                >
                  <div className="text-sm sm:text-base font-mono">{n} Paare</div>
                  <div className={`text-[10px] mt-0.5 ${currentPairsCount === n ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {n * cardsPerTurn} Karten
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: Abzufragende Eigenschaften (Schnittmenge der gewählten Sets) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>3. Abzufragende Eigenschaften ({validSelectedProps.length} gewählt)</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isOriginal
                    ? 'Wähle genau 2 beliebige Eigenschaften für das Paar-Memory (per Klick an- oder abwählen).'
                    : isExtended
                    ? `Wähle mindestens 3 bis hin zu allen (${sharedProperties.length}) geteilten Eigenschaften (farbkodierte Rückseiten).`
                    : 'Wähle mindestens 2 beliebige Eigenschaften für das offene Lernbrett.'}
                </p>
              </div>

              {/* Quick Actions (Select all / Deselect) & Mode Status Badges */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {isExtended ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAllSharedProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Alle ({sharedProperties.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Keine
                    </button>
                  </>
                ) : isOriginal ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResetClassicProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Standard (2)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Keine
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAllSharedProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedProps}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Keine
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Validation Notice Banner */}
            <div className="mb-2">
              {isOriginal && validSelectedProps.length === 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Genau 2 Eigenschaften gewählt · Spielbereit für den klassischen Modus.</span>
                </div>
              )}
              {isOriginal && validSelectedProps.length < 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Bitte wähle noch {2 - validSelectedProps.length} Eigenschaft(en) an (genau 2 für den klassischen Modus).</span>
                </div>
              )}
              {isOriginal && validSelectedProps.length > 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{validSelectedProps.length} Eigenschaften aktiv · Bitte wähle {validSelectedProps.length - 2} Eigenschaft(en) ab (genau 2 für den klassischen Modus).</span>
                </div>
              )}

              {isExtended && validSelectedProps.length >= 3 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{validSelectedProps.length} von {sharedProperties.length} Eigenschaften aktiv · Farbkodierte Rückseiten aktiv.</span>
                </div>
              )}
              {isExtended && validSelectedProps.length < 3 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Mindestens 3 Eigenschaften erforderlich (aktuell {validSelectedProps.length} gewählt).</span>
                </div>
              )}

              {isOpenMode && validSelectedProps.length >= 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{validSelectedProps.length} von {sharedProperties.length} Eigenschaften aktiv.</span>
                </div>
              )}
              {isOpenMode && validSelectedProps.length < 2 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Mindestens 2 Eigenschaften erforderlich (aktuell {validSelectedProps.length} gewählt).</span>
                </div>
              )}
            </div>

            {/* Properties Grid with disabled states for non-shared properties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allProperties.map((p) => {
                const isSelected = validSelectedProps.includes(p.key);
                const colorIdx = isSelected ? validSelectedProps.indexOf(p.key) : -1;
                const colorTheme = colorIdx >= 0 ? BACK_COLOR_THEMES[colorIdx % BACK_COLOR_THEMES.length] : null;
                const frontTheme = colorIdx >= 0 ? PROPERTY_FRONT_THEMES[colorIdx % PROPERTY_FRONT_THEMES.length] : null;

                if (!p.isShared) {
                  return (
                    <div
                      key={p.key}
                      title={`Nicht in allen gewählten Sets enthalten (fehlt in: ${p.missingSets.join(', ')})`}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs line-through">{p.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Nicht in allen Sets</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleToggleProperty(p.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? isExtended && colorTheme
                          ? `${colorTheme.border} bg-gradient-to-r ${colorTheme.bg} ring-1 ring-emerald-500 text-slate-950 dark:text-white shadow-xs`
                          : frontTheme
                          ? `${frontTheme.border} ${frontTheme.bg} ring-1 ring-emerald-500 text-slate-950 dark:text-white shadow-xs`
                          : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-slate-950 dark:text-white ring-1 ring-emerald-500 shadow-xs'
                        : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected && (
                        <span
                          className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                            isExtended && colorTheme ? colorTheme.iconBox : frontTheme?.badge || 'bg-emerald-500'
                          }`}
                          title={`Eigenschaft ${colorIdx + 1}`}
                        />
                      )}
                      <span className="text-xs font-bold truncate">{p.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isExtended && isSelected && (
                        <span className="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                          Rückseite {colorIdx + 1}
                        </span>
                      )}
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation Note for Extended Mode */}
            {isExtended && (
              <div className="mt-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-950 dark:text-purple-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Erweitertes Memory mit Hilfestellung:</strong> Da hier {validSelectedProps.length} Karten pro Zug zusammengehören, erhalten gleichartige Karten auf der Rückseite unterschiedliche Farbakzente. Du kannst bis zu alle {sharedProperties.length} gemeinsamen Eigenschaften auswählen!
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: Spieler-Modus (Solo vs. Duell) */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide mb-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>4. Spielmodus</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGameMode('solo')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === 'solo'
                    ? 'border-emerald-500 bg-emerald-600 text-white font-bold shadow-xs'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Einzelspieler (Solo)</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('versus')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === 'versus'
                    ? 'border-emerald-500 bg-emerald-600 text-white font-bold shadow-xs'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Duell (2 Spieler)</span>
              </button>
            </div>

            {/* Duel Player Names Inputs */}
            {gameMode === 'versus' && (
              <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex flex-col gap-2.5 animate-fade-in">
                <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Spielernamen festlegen & zuordnen:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Spieler 1 (beginnt Runde 1):
                    </label>
                    <input
                      type="text"
                      value={player1Name}
                      onChange={(e) => setPlayer1Name(e.target.value)}
                      placeholder="Spieler 1"
                      maxLength={20}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Spieler 2:
                    </label>
                    <input
                      type="text"
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="Spieler 2"
                      maxLength={20}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
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
            onClick={handleStart}
            disabled={!isSelectionValid}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {!isSelectionValid
                ? isOriginal
                  ? validSelectedProps.length < 2
                    ? `Bitte 2 Eigenschaften wählen (${validSelectedProps.length}/2)`
                    : `Genau 2 Eigenschaften wählen (${validSelectedProps.length}/2)`
                  : isExtended
                  ? `Mindestens 3 Eigenschaften (${validSelectedProps.length} gewählt)`
                  : `Mindestens 2 Eigenschaften (${validSelectedProps.length} gewählt)`
                : `Runde starten (${totalCardsOnBoard} Karten)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const GameSetupModal: React.FC<GameSetupModalProps> = (props) => {
  if (!props.isOpen || !props.config) return null;
  return <GameSetupModalContent {...props} config={props.config} />;
};
