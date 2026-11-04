import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CardItem, CardSet, Difficulty, GameMode, BoardDisplayMode, CardProperty, GameVariant } from '../types/memory';
import { DIFFICULTIES } from '../data/difficulties';
import { MemoryCard, PROPERTY_FRONT_THEMES } from './MemoryCard';
import { CardZoomModal } from './CardZoomModal';
import { sound } from '../utils/sound';
import { recordGameStats } from '../utils/storage';
import { sampleWeightedConcepts, recordConceptReview, getSetMasterySummary } from '../utils/learningStorage';
import {
  Clock,
  RotateCcw,
  Eye,
  Pause,
  Play,
  User,
  Flame,
  CheckCircle2,
  ZoomIn,
  Brain,
} from 'lucide-react';

interface GameBoardProps {
  cardSet: CardSet;
  difficulty: Difficulty;
  gameMode: GameMode;
  boardDisplayMode: BoardDisplayMode;
  onGameComplete: (stats: {
    timeSeconds: number;
    moves: number;
    versusWinner: { name: string; score: number } | null;
    versusDetails?: {
      player1: { name: string; score: number };
      player2: { name: string; score: number };
      winnerPlayer: 1 | 2 | 'draw';
      loserPlayer: 1 | 2 | null;
    };
  }) => void;
  theme: 'light' | 'dark';
  customPairsCount?: number;
  gameVariant?: GameVariant;
  initialActiveProperties?: string[];
  versusPlayer1Name?: string;
  versusPlayer2Name?: string;
  initialActivePlayer?: 1 | 2;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  cardSet,
  difficulty,
  gameMode,
  boardDisplayMode,
  onGameComplete,
  theme,
  customPairsCount,
  gameVariant = 'open',
  initialActiveProperties,
  versusPlayer1Name = 'Spieler 1',
  versusPlayer2Name = 'Spieler 2',
  initialActivePlayer = 1,
}) => {
  const diffConfig = DIFFICULTIES[difficulty];
  const totalConceptsRequired = Math.min(
    cardSet.pairs.length,
    customPairsCount || diffConfig.pairs
  );

  const p1Name = versusPlayer1Name.trim() || 'Spieler 1';
  const p2Name = versusPlayer2Name.trim() || 'Spieler 2';

  // Multi-Property Configuration
  // If cardSet has availableProperties, allow user to toggle which ones to query
  const availableProps = useMemo(() => {
    if (cardSet.availableProperties && cardSet.availableProperties.length >= 2) {
      return cardSet.availableProperties;
    }
    return [
      { key: 'A', label: 'Vorderseite' },
      { key: 'B', label: 'Rückseite' },
    ];
  }, [cardSet]);

  const [activePropertyKeys, setActivePropertyKeys] = useState<string[]>(() => {
    if (initialActiveProperties && initialActiveProperties.length >= 2) {
      return initialActiveProperties;
    }
    if (cardSet.availableProperties && cardSet.availableProperties.length >= 2) {
      const defaultSlice = gameVariant === 'original' ? 2 : Math.min(3, cardSet.availableProperties.length);
      return cardSet.availableProperties.slice(0, defaultSlice).map((p) => p.key);
    }
    return ['A', 'B'];
  });

  // Re-sync activePropertyKeys if cardSet or initialActiveProperties changes
  useEffect(() => {
    if (initialActiveProperties && initialActiveProperties.length >= 2) {
      setActivePropertyKeys(initialActiveProperties);
    } else if (cardSet.availableProperties && cardSet.availableProperties.length >= 2) {
      const defaultSlice = gameVariant === 'original' ? 2 : Math.min(3, cardSet.availableProperties.length);
      setActivePropertyKeys(
        cardSet.availableProperties.slice(0, defaultSlice).map((p) => p.key)
      );
    } else {
      setActivePropertyKeys(['A', 'B']);
    }
  }, [cardSet, initialActiveProperties, gameVariant]);

  // Turn requirement: how many cards must be selected/flipped per turn
  const cardsPerTurn = Math.max(2, activePropertyKeys.length);

  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isProcessingMismatch, setIsProcessingMismatch] = useState(false);
  const [streak, setStreak] = useState(0);
  const [peekCharges, setPeekCharges] = useState(2);
  const [isPeeking, setIsPeeking] = useState(false);

  // Zoom Modal state
  const [zoomedCard, setZoomedCard] = useState<CardItem | null>(null);
  const boardSizeRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  // Versus Mode Players State
  const [activePlayer, setActivePlayer] = useState<1 | 2>(initialActivePlayer || 1);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [lastMatchFeedback, setLastMatchFeedback] = useState<{
    title: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  const isOpenMode = boardDisplayMode === 'open';

  // Mastery Summary for Spaced Repetition badge
  const masterySummary = getSetMasterySummary(
    cardSet.id,
    cardSet.pairs.map((p) => p.id)
  );

  useEffect(() => {
    const board = boardSizeRef.current;
    if (!board) return;

    const updateBoardSize = () => {
      const { width, height } = board.getBoundingClientRect();
      setBoardSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    };
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBoardSize);
      updateBoardSize();
      return () => window.removeEventListener('resize', updateBoardSize);
    }

    const observer = new ResizeObserver(updateBoardSize);
    observer.observe(board);
    updateBoardSize();
    return () => observer.disconnect();
  }, []);

  // Initialize or restart board with Spaced Repetition sampling
  const setupGame = useCallback(() => {
    const rawPairs = [...cardSet.pairs];
    if (rawPairs.length === 0) return;

    // 1. Spaced Repetition Sampling:
    // Items with mistakes/uncertainties appear significantly more often!
    const selectedConcepts = sampleWeightedConcepts(rawPairs, totalConceptsRequired, cardSet.id);

    // 2. Generate cards for each active property
    const generatedCards: CardItem[] = [];

    selectedConcepts.forEach((concept, cIdx) => {
      activePropertyKeys.forEach((pKey) => {
        let propData: CardProperty | undefined;

        if (concept.properties && concept.properties[pKey]) {
          propData = concept.properties[pKey];
        } else if (pKey === 'A') {
          propData = {
            id: `${concept.id}_A`,
            key: 'A',
            label: concept.cardA.label || 'Vorderseite',
            content: concept.cardA.content,
            type: concept.cardA.type,
          };
        } else if (pKey === 'B') {
          propData = {
            id: `${concept.id}_B`,
            key: 'B',
            label: concept.cardB.label || 'Rückseite',
            content: concept.cardB.content,
            type: concept.cardB.type,
          };
        } else {
          // Fallback to first property
          const firstVal = concept.properties ? Object.values(concept.properties)[0] : null;
          propData = firstVal || {
            id: `${concept.id}_${pKey}`,
            key: pKey,
            label: pKey,
            content: concept.cardA.content,
            type: concept.cardA.type,
          };
        }

        const propMeta = availableProps.find((p) => p.key === pKey);
        const propColorIndex = activePropertyKeys.indexOf(pKey);

        generatedCards.push({
          id: `${concept.id}-${pKey}-${cIdx}`,
          conceptId: concept.id,
          pairId: concept.id,
          propertyKey: pKey,
          propertyLabel: propMeta?.label || propData.label,
          propertyColorIndex: propColorIndex >= 0 ? propColorIndex : undefined,
          side: pKey,
          content: propData.content,
          type: propData.type,
          label: propData.label || concept.title,
          isFlipped: false,
          isMatched: false,
          isSelected: false,
          isMismatchAnim: false,
          isOutlierMismatch: false,
        });
      });
    });

    // Fisher-Yates shuffle
    for (let i = generatedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generatedCards[i], generatedCards[j]] = [generatedCards[j], generatedCards[i]];
    }

    setCards(generatedCards);
    setSelectedIndices([]);
    setMatchedPairsCount(0);
    setMoves(0);
    setTimeSeconds(0);
    setIsPaused(false);
    setIsGameActive(true);
    setIsProcessingMismatch(false);
    setStreak(0);
    setPeekCharges(2);
    setActivePlayer(initialActivePlayer || 1);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setZoomedCard(null);
  }, [cardSet, totalConceptsRequired, activePropertyKeys, availableProps, initialActivePlayer]);

  // Restart whenever cardSet, difficulty, activePropertyKeys, or boardDisplayMode changes
  useEffect(() => {
    setupGame();
  }, [setupGame, boardDisplayMode]);

  // Timer loop
  useEffect(() => {
    if (!isGameActive || isPaused || matchedPairsCount >= totalConceptsRequired) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameActive, isPaused, matchedPairsCount, totalConceptsRequired]);

  // Check victory condition
  useEffect(() => {
    if (matchedPairsCount > 0 && matchedPairsCount === totalConceptsRequired) {
      setIsGameActive(false);
      recordGameStats(true, timeSeconds, moves, matchedPairsCount, cardSet.id);

      let winnerInfo = null;
      let versusDetailsInfo = undefined;

      if (gameMode === 'versus') {
        const winnerPlayer: 1 | 2 | 'draw' =
          player1Score > player2Score ? 1 : player2Score > player1Score ? 2 : 'draw';
        const loserPlayer: 1 | 2 | null =
          player1Score > player2Score ? 2 : player2Score > player1Score ? 1 : null;

        if (winnerPlayer === 1) {
          winnerInfo = { name: p1Name, score: player1Score };
        } else if (winnerPlayer === 2) {
          winnerInfo = { name: p2Name, score: player2Score };
        } else {
          winnerInfo = { name: 'Unentschieden', score: player1Score };
        }

        versusDetailsInfo = {
          player1: { name: p1Name, score: player1Score },
          player2: { name: p2Name, score: player2Score },
          winnerPlayer,
          loserPlayer,
        };
      }

      const victoryTimeout = setTimeout(() => {
        onGameComplete({
          timeSeconds,
          moves,
          versusWinner: winnerInfo,
          versusDetails: versusDetailsInfo,
        });
      }, 500);

      return () => clearTimeout(victoryTimeout);
    }
  }, [matchedPairsCount, totalConceptsRequired, timeSeconds, moves, cardSet.id, gameMode, player1Score, player2Score, p1Name, p2Name, onGameComplete]);

  /**
   * Evaluates if a card correctly matches a target concept for its propertyKey.
   * "Haben zwei oder mehrere Karten einen identischen Text, muss sich die Bewertung nach der Richtigkeit des Textes richten."
   */
  const doesCardMatchConcept = (card: CardItem, conceptId: string): boolean => {
    // Direct concept ID match
    if (card.conceptId === conceptId) return true;

    // Check if concept's property has identical content/text
    const concept = cardSet.pairs.find((p) => p.id === conceptId);
    if (!concept) return false;

    if (concept.properties && concept.properties[card.propertyKey]) {
      const prop = concept.properties[card.propertyKey];
      if (prop.content.trim().toLowerCase() === card.content.trim().toLowerCase()) {
        return true;
      }
    }
    if (card.propertyKey === 'A' && concept.cardA.content.trim().toLowerCase() === card.content.trim().toLowerCase()) {
      return true;
    }
    if (card.propertyKey === 'B' && concept.cardB.content.trim().toLowerCase() === card.content.trim().toLowerCase()) {
      return true;
    }

    return false;
  };

  /**
   * Process a completed turn of K cards (where K = cardsPerTurn)
   */
  const evaluateTurn = (turnIndices: number[]) => {
    setMoves((m) => m + 1);
    setIsProcessingMismatch(true);

    const chosenCards = turnIndices.map((idx) => cards[idx]);

    // Check all concepts in cardSet to find if there is a concept that matches ALL chosen cards
    // AND each card must represent a unique property (no two cards for the same property unless intended)
    const propertyKeysInTurn = new Set(chosenCards.map((c) => c.propertyKey));
    const allUniqueProperties = propertyKeysInTurn.size === chosenCards.length;

    let matchedConceptId: string | null = null;

    if (allUniqueProperties) {
      for (const concept of cardSet.pairs) {
        const matchesAll = chosenCards.every((card) => doesCardMatchConcept(card, concept.id));
        if (matchesAll) {
          matchedConceptId = concept.id;
          break;
        }
      }
    }

    if (matchedConceptId) {
      // === SUCCESSFUL MATCH! ===
      sound.playMatch();
      setStreak((s) => s + 1);

      const matchedConcept = cardSet.pairs.find((p) => p.id === matchedConceptId);
      if (matchedConcept) {
        setLastMatchFeedback({
          title: matchedConcept.title,
        });
        setTimeout(() => {
          setLastMatchFeedback(null);
        }, 4000);
      }

      // Record success in Spaced Repetition (weight decreases, appears rarer)
      recordConceptReview(cardSet.id, matchedConceptId, 'correct');

      if (gameMode === 'versus') {
        if (activePlayer === 1) setPlayer1Score((s) => s + 1);
        else setPlayer2Score((s) => s + 1);
      }

      setCards((prev) =>
        prev.map((c, i) =>
          turnIndices.includes(i)
            ? { ...c, isMatched: true, isSelected: false, isFlipped: true, isOutlierMismatch: false, isMismatchAnim: false }
            : { ...c, isSelected: false }
        )
      );

      setMatchedPairsCount((c) => c + 1);
      setSelectedIndices([]);
      setIsProcessingMismatch(false);
    } else {
      // === MISMATCH OCCURRED ===
      sound.playMismatch();
      setStreak(0);

      // Analyze which concept had the most matches among the selected cards to find the outlier:
      // "Ist eine falsch, soll die nicht passende Karte durch einen roten Rahmen gekennzeichnet werden.
      // Passen keine Karten zueinander, werden alle kurzzeitig mit einem roten Rahmen versehen."
      let bestConceptId: string | null = null;
      let maxMatchCount = 0;

      for (const concept of cardSet.pairs) {
        const matchCount = chosenCards.filter((card) => doesCardMatchConcept(card, concept.id)).length;
        if (matchCount > maxMatchCount) {
          maxMatchCount = matchCount;
          bestConceptId = concept.id;
        }
      }

      // Record mistakes in Spaced Repetition for struggling concepts (weight increases!)
      chosenCards.forEach((c) => {
        recordConceptReview(cardSet.id, c.conceptId, 'incorrect');
      });

      if (bestConceptId && maxMatchCount >= 2 && maxMatchCount === chosenCards.length - 1) {
        // CASE A: Exactly one card was wrong (the outlier)!
        const outlierConceptId = bestConceptId;
        setCards((prev) =>
          prev.map((c, i) => {
            if (turnIndices.includes(i)) {
              const isMatchWithBest = doesCardMatchConcept(c, outlierConceptId);
              return {
                ...c,
                isOutlierMismatch: !isMatchWithBest, // ONLY the outlier card gets the prominent red border!
                isMismatchAnim: !isMatchWithBest,
              };
            }
            return c;
          })
        );
      } else {
        // CASE B: None of the cards match each other (or all are wrong)
        // All selected cards get a red border
        setCards((prev) =>
          prev.map((c, i) =>
            turnIndices.includes(i)
              ? { ...c, isMismatchAnim: true, isOutlierMismatch: false }
              : c
          )
        );
      }

      // Allow 1.1s for user to inspect the error, see the red outline, and learn
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            turnIndices.includes(i)
              ? {
                  ...c,
                  isFlipped: isOpenMode, // In open mode stay revealed, in classic mode flip face down
                  isSelected: false,
                  isMismatchAnim: false,
                  isOutlierMismatch: false,
                }
              : { ...c, isSelected: false }
          )
        );

        setSelectedIndices([]);
        setIsProcessingMismatch(false);

        if (gameMode === 'versus') {
          setActivePlayer((curr) => (curr === 1 ? 2 : 1));
        }
      }, 1100);
    }
  };

  // Card click logic in CLASSIC MODE (Flips cards face-up one by one)
  const handleClassicCardClick = (index: number) => {
    if (
      isPaused ||
      isProcessingMismatch ||
      isPeeking ||
      selectedIndices.includes(index) ||
      cards[index].isMatched
    ) {
      return;
    }

    sound.playFlip();

    const newIndices = [...selectedIndices, index];

    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isFlipped: true, isSelected: true } : c))
    );
    setSelectedIndices(newIndices);

    // If reached cardsPerTurn -> Evaluate!
    if (newIndices.length === cardsPerTurn) {
      evaluateTurn(newIndices);
    }
  };

  // Card click logic in OPEN LEARN MODE (All cards visible, user selects K cards)
  const handleOpenModeCardClick = (index: number) => {
    if (isPaused || isProcessingMismatch || cards[index].isMatched) {
      return;
    }

    // If card was already selected, clicking again deselects it
    if (selectedIndices.includes(index)) {
      const next = selectedIndices.filter((i) => i !== index);
      setSelectedIndices(next);
      setCards((prev) =>
        prev.map((c, i) => (i === index ? { ...c, isSelected: false } : c))
      );
      return;
    }

    sound.playFlip();
    const newIndices = [...selectedIndices, index];

    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isSelected: true } : c))
    );
    setSelectedIndices(newIndices);

    // If reached cardsPerTurn -> Evaluate!
    if (newIndices.length === cardsPerTurn) {
      evaluateTurn(newIndices);
    }
  };

  const handleCardClick = (index: number) => {
    if (isOpenMode) {
      handleOpenModeCardClick(index);
    } else {
      handleClassicCardClick(index);
    }
  };

  // Peek helper (for classic mode)
  const handleUsePeek = () => {
    if (peekCharges <= 0 || isPeeking || isProcessingMismatch || !isGameActive) return;

    sound.playPeek();
    setPeekCharges((c) => c - 1);
    setIsPeeking(true);

    const unmatchedCards = cards.filter((c) => !c.isMatched && !c.isFlipped);
    if (unmatchedCards.length < cardsPerTurn) {
      setIsPeeking(false);
      return;
    }

    const targetConceptId = unmatchedCards[0].conceptId;
    setCards((prev) =>
      prev.map((c) =>
        c.conceptId === targetConceptId && !c.isMatched
          ? { ...c, isPeeked: true }
          : c
      )
    );

    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isPeeked: false })));
      setIsPeeking(false);
    }, 1200);
  };

  const getGridLayout = () => {
    const total = cards.length;
    const maxColumns =
      boardSize.width >= 1280 ? 12 : boardSize.width >= 1024 ? 10 : boardSize.width >= 768 ? 8 : boardSize.width >= 640 ? 6 : 8;
    const columnLimit = Math.max(1, Math.min(total, maxColumns));
    let bestColumns = 1;
    let bestCardSize = 0;
    for (let columns = 1; columns <= columnLimit; columns += 1) {
      const rows = Math.ceil(total / columns);
      const cardWidth = (boardSize.width - (columns - 1) * 4) / columns;
      const cardHeight = (boardSize.height - (rows - 1) * 4) / rows;
      const cardSize = Math.min(cardWidth, cardHeight);
      if (cardSize > bestCardSize) {
        bestCardSize = cardSize;
        bestColumns = columns;
      }
    }
    return { columns: bestColumns, cardSize: bestCardSize };
  };
  const gridLayout = getGridLayout();
  const gridColumns = gridLayout.columns;
  const gridRows = Math.max(1, Math.ceil(cards.length / gridColumns));

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remain = secs % 60;
    return `${mins}:${remain.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-board-root w-full max-w-6xl mx-auto h-[calc(100dvh-4rem)] min-h-0 px-2 sm:px-6 py-2 sm:py-4 flex flex-col gap-2 sm:gap-4 overflow-hidden">
      {/* Top HUD Header */}
      <div className="game-board-hud w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-3">
        {/* Row 1: Set Info, Mastery Progress & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Card Set Info */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl select-none" aria-hidden="true">
              {cardSet.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {cardSet.title}
                </h2>
                {/* Spaced Repetition Mastery Badge */}
                <div
                  className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold"
                  title="Wissenschaftliche Spaced Repetition: Häufig falsche Karten erscheinen öfter, sichere seltener."
                >
                  <Brain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Lernmodus aktiv ({masterySummary.percentage}% gemeistert)</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{cardSet.category}</span>
                <span aria-hidden="true">·</span>
                <span>{diffConfig.label} ({totalConceptsRequired} Konzepte)</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {cardsPerTurn} Karten pro Zug
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Peek, Pause, Restart */}
          <div className="flex items-center gap-2">
            {!isOpenMode && (
              <button
                onClick={handleUsePeek}
                disabled={peekCharges <= 0 || isPeeking || !isGameActive}
                title={`Späher-Tipp nutzen (${peekCharges} übrig)`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  peekCharges > 0 && isGameActive
                    ? 'border-amber-400/80 dark:border-amber-500/70 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 shadow-xs cursor-pointer'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-60'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Tipp ({peekCharges})</span>
              </button>
            )}

            <button
              onClick={() => setIsPaused((p) => !p)}
              disabled={!isGameActive}
              aria-label={isPaused ? 'Fortsetzen' : 'Pausieren'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current text-emerald-500" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={setupGame}
              aria-label="Spiel neu starten"
              title="Neu mischen & starten (Priorisiert Lernbedarf)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Neustart</span>
            </button>
          </div>
        </div>

        {/* Row 2: Fixed Round Configuration (Read-only during round) */}
        <div className="game-board-config hidden sm:flex pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {gameVariant === 'original'
                ? 'Klassisch: Original (2er-Paare)'
                : gameVariant === 'extended'
                ? `Klassisch: Erweitert (${cardsPerTurn}er-Gruppen)`
                : `Lernmodus: Offene Zuordnung (${cardsPerTurn}er-Gruppen)`}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Ziel: <strong className="text-slate-700 dark:text-slate-200">{totalConceptsRequired} {cardsPerTurn === 2 ? 'Paare' : 'Sets'}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Eigenschaften:</span>
            {activePropertyKeys.map((pKey, idx) => {
              const pMeta = availableProps.find((p) => p.key === pKey);
              const pTheme = PROPERTY_FRONT_THEMES[idx % PROPERTY_FRONT_THEMES.length];
              return (
                <span
                  key={pKey}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs ${pTheme.badge}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  <span>{pMeta?.label || pKey}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Row 3: Bottom HUD Metrics Strip */}
        <div className="game-board-metrics grid grid-cols-4 gap-1 sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="min-w-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0 text-center sm:text-left leading-tight">
              <div className="whitespace-nowrap text-[clamp(0.65rem,2.8vw,0.8rem)] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">Zeit</div>
              <div className="whitespace-nowrap text-[clamp(0.72rem,3vw,1rem)] sm:text-sm md:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatTimer(timeSeconds)}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800">
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0 text-center sm:text-left leading-tight">
              <div className="whitespace-nowrap text-[clamp(0.65rem,2.8vw,0.8rem)] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">Versuche</div>
              <div className="whitespace-nowrap text-[clamp(0.72rem,3vw,1rem)] sm:text-sm md:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {moves}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 shrink-0" />
            <div className="min-w-0 text-center sm:text-left leading-tight">
              <div className="whitespace-nowrap text-[clamp(0.65rem,2.8vw,0.8rem)] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">Gelöst</div>
              <div className="whitespace-nowrap text-[clamp(0.72rem,3vw,1rem)] sm:text-sm md:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {matchedPairsCount} / {totalConceptsRequired}
              </div>
            </div>
          </div>

          {gameMode === 'versus' ? (
            <div className="min-w-0 flex items-center justify-center px-0.5 sm:px-3 py-1.5 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 gap-0.5 sm:gap-2">
              <div
                className={`min-w-0 flex items-center gap-0.5 sm:gap-1.5 px-0.5 sm:px-2 py-1 rounded-lg transition-all ${
                  activePlayer === 1
                    ? 'font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 shadow-xs ring-1 ring-emerald-500/50'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
                title={activePlayer === 1 ? `${p1Name} ist am Zug` : undefined}
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-[clamp(0.55rem,2vw,0.75rem)] sm:text-xs truncate max-w-[5rem]">{p1Name}:</span>
                <span className="font-mono font-extrabold text-[clamp(0.55rem,2vw,0.75rem)] sm:text-xs">{player1Score}</span>
                {activePlayer === 1 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Am Zug" />
                )}
              </div>

              <span className="text-[8px] sm:text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-600">vs</span>

              <div
                className={`min-w-0 flex items-center gap-0.5 sm:gap-1.5 px-0.5 sm:px-2 py-1 rounded-lg transition-all ${
                  activePlayer === 2
                    ? 'font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-500/50'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
                title={activePlayer === 2 ? `${p2Name} ist am Zug` : undefined}
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-[clamp(0.55rem,2vw,0.75rem)] sm:text-xs truncate max-w-[5rem]">{p2Name}:</span>
                <span className="font-mono font-extrabold text-[clamp(0.55rem,2vw,0.75rem)] sm:text-xs">{player2Score}</span>
                {activePlayer === 2 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" title="Am Zug" />
                )}
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50/80 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800">
              <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${streak > 1 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              <div className="min-w-0 text-center sm:text-left leading-tight">
                <div className="whitespace-nowrap text-[clamp(0.65rem,2.8vw,0.8rem)] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">Serie</div>
                <div className="whitespace-nowrap text-[clamp(0.72rem,3vw,1rem)] sm:text-sm md:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {streak > 1 ? `${streak}x Serie!` : streak === 1 ? '1 Treffer' : '0'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pedagogical Hint Banner with Turn Requirement */}
      <div className="game-board-hint hidden sm:flex px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">
            {isOpenMode ? (
              <>
                <strong>Offener Lernmodus:</strong> Wähle pro Zug <strong>{cardsPerTurn} zusammengehörige Karten</strong> aus ({activePropertyKeys.map((k) => availableProps.find((p) => p.key === k)?.label).join(' + ')}).
              </>
            ) : gameVariant === 'extended' ? (
              <>
                <strong>Erweitertes Memory:</strong> Finde jeweils <strong>{cardsPerTurn} zusammengehörige Karten</strong>. Karten gleicher Eigenschaft teilen dieselbe Rückseitenfarbe!
              </>
            ) : (
              <>
                <strong>Klassisches Memory:</strong> Finde alle <strong>{totalConceptsRequired} Paare</strong> (2 Karten pro Zug aufdecken).
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap shrink-0">
          <ZoomIn className="w-3.5 h-3.5 text-emerald-500" />
          <span>3s Hovern oder langes Drücken für Zoom</span>
        </div>
      </div>

      {/* Active Turn Progress Bar (e.g. 1 / 3 Karten gewählt) */}
      {selectedIndices.length > 0 && (
        <div className="game-board-status px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-extrabold">
              {selectedIndices.length} / {cardsPerTurn}
            </span>
            <span className="game-board-status-description">
              Karten ausgewählt. Wähle noch {cardsPerTurn - selectedIndices.length} passende Karte(n), um das Set zu vervollständigen!
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedIndices([]);
              setCards((prev) => prev.map((c) => ({ ...c, isSelected: false })));
            }}
            className="text-xs font-bold underline hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
          >
            Auswahl zurücksetzen
          </button>
        </div>
      )}

      {/* Successful Match Feedback Banner */}
      {lastMatchFeedback && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
              ✓
            </div>
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold mr-1.5">Treffer gefunden:</span>
              <strong className="text-slate-950 dark:text-white font-extrabold">{lastMatchFeedback.title}</strong>
            </div>
          </div>
          <button
            onClick={() => setLastMatchFeedback(null)}
            className="text-xs font-bold underline hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer shrink-0 ml-3"
          >
            Ausblenden
          </button>
        </div>
      )}

      {/* Main Board Grid or Pause Overlay */}
      <div ref={boardSizeRef} className="relative flex-1 min-h-0 flex items-center justify-center">
        {isPaused ? (
          <div className="w-full py-16 px-6 rounded-3xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
            <Pause className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Spiel pausiert</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Das Spiel wurde angehalten. Klicke auf Fortsetzen, um weiterzulernen.
            </p>
            <button
              onClick={() => setIsPaused(false)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Weiterspielen</span>
            </button>
          </div>
        ) : (
          <div
            className="memory-card-grid w-full h-full min-h-0 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
              '--card-size': `${gridLayout.cardSize}px`,
            } as React.CSSProperties}
          >
            {cards.map((card, idx) => (
              <MemoryCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(idx)}
                onZoom={(targetCard) => setZoomedCard(targetCard)}
                disabled={isProcessingMismatch || isPeeking}
                theme={theme}
                isOpenMode={isOpenMode}
                gameVariant={gameVariant}
              />
            ))}
          </div>
        )}
      </div>

      {/* High-Resolution Inspection Zoom Modal */}
      <CardZoomModal card={zoomedCard} onClose={() => setZoomedCard(null)} />
    </div>
  );
};
