/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  CardSet,
  Difficulty,
  GameMode,
  HighscoreEntry,
  PlayerStats,
  BoardDisplayMode,
  GameVariant
} from './types/memory';
import { Navbar, ActiveTab } from './components/Navbar';
import { MainMenu } from './components/MainMenu';
import { GameSetupModal, GameSetupConfig } from './components/GameSetupModal';
import { GameBoard } from './components/GameBoard';
import { ActiveRecallTrainer } from './components/ActiveRecallTrainer';
import { DrawingTrainer } from './components/DrawingTrainer';
import { CardSetSelector } from './components/CardSetSelector';
import { CustomSetEditor } from './components/CustomSetEditor';
import { LeaderboardView } from './components/LeaderboardView';
import { StatsView } from './components/StatsView';
import { VictoryModal } from './components/VictoryModal';
import { TrainerSetupModal } from './components/TrainerSetupModal';
import { InfoTourModal } from './components/InfoTourModal';
import { KoFiButton } from './components/KoFiButton';
import { APP_VERSION } from './utils/version';
import {
  getStoredTheme,
  setStoredTheme,
  getAllCardSets,
  saveCardSet,
  deleteCardSet,
  getHighscores,
  clearHighscores,
  getPlayerStats,
  replaceAllCardSets,
  isRemovedDemoSet,
} from './utils/storage';
import { sound } from './utils/sound';
import { reportAppError } from './utils/errorReporting';
import {
  acceptSuggestedSetsStorage,
  chooseSetsStorage,
  deleteSavedSet,
  initializeSetsStorage,
  isTauriApp,
  loadSavedSets,
  SetsStorageStatus,
  writeSavedSet,
} from './utils/setFiles';

const EMPTY_CARD_SET: CardSet = {
  id: '',
  title: '',
  description: '',
  category: '',
  icon: '',
  color: 'emerald',
  pairs: [],
  availableProperties: [],
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMuted, setIsMuted] = useState(false);

  // Initial tab is the game-typical main menu
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [navHistory, setNavHistory] = useState<ActiveTab[]>(['menu']);

  // Pre-Game Setup Modal state
  const [gameSetupConfig, setGameSetupConfig] = useState<GameSetupConfig | null>(null);
  const [trainerSetupMode, setTrainerSetupMode] = useState<'recall' | 'drawing' | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Card Sets state - all sets are editable and deletable
  const [allSets, setAllSets] = useState<CardSet[]>(() => getAllCardSets());
  const [activeCardSet, setActiveCardSet] = useState<CardSet>(() => {
    const initial = getAllCardSets();
    return initial[0] || EMPTY_CARD_SET;
  });
  const [editingSet, setEditingSet] = useState<CardSet | null>(null);
  const [setsStorageSetup, setSetsStorageSetup] = useState<SetsStorageStatus | null>(null);
  const [setsStoragePath, setSetsStoragePath] = useState<string | null>(null);
  const [setsStorageError, setSetsStorageError] = useState<string | null>(null);
  const [isSettingUpSetsStorage, setIsSettingUpSetsStorage] = useState(false);

  // Game Settings state
  const difficulty: Difficulty = 'medium';
  const [customPairsCount, setCustomPairsCount] = useState<number>(8);
  const [gameVariant, setGameVariant] = useState<GameVariant>('original');
  const [activeProperties, setActiveProperties] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [boardDisplayMode, setBoardDisplayMode] = useState<BoardDisplayMode>('classic');
  const [gameKey, setGameKey] = useState<number>(1);

  // Leaderboard & Stats
  const [highscores, setHighscores] = useState<HighscoreEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    bestTimeSec: null,
    fewestMoves: null,
    totalMatches: 0,
    favoriteSetId: null,
  });

  // Victory Modal state
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [versusPlayer1Name, setVersusPlayer1Name] = useState<string>('Spieler 1');
  const [versusPlayer2Name, setVersusPlayer2Name] = useState<string>('Spieler 2');
  const [versusStartingPlayer, setVersusStartingPlayer] = useState<1 | 2>(1);
  const [lastGameStats, setLastGameStats] = useState<{
    timeSeconds: number;
    moves: number;
    versusWinner: { name: string; score: number } | null;
    versusDetails?: {
      player1: { name: string; score: number };
      player2: { name: string; score: number };
      winnerPlayer: 1 | 2 | 'draw';
      loserPlayer: 1 | 2 | null;
    };
  }>({
    timeSeconds: 0,
    moves: 0,
    versusWinner: null,
  });

  // Load initial persisted data on mount & check for first-time tour
  useEffect(() => {
    const initialTheme = getStoredTheme();
    setTheme(initialTheme);
    setStoredTheme(initialTheme);

    setIsMuted(sound.isMuted());
    const loadedSets = getAllCardSets();
    setAllSets(loadedSets);
    setActiveCardSet(loadedSets[0] || EMPTY_CARD_SET);
    setHighscores(getHighscores());
    setPlayerStats(getPlayerStats());

    // Show tour once on first-time visit
    const tourSeen = localStorage.getItem('pandamatch_tour_seen');
    if (!tourSeen) {
      setIsTourOpen(true);
    }
  }, []);

  const finishSetsStorageSetup = async (activePath: string) => {
    setSetsStoragePath(activePath);
    setSetsStorageSetup(null);
    setSetsStorageError(null);
    const savedSets = await loadSavedSets();
    const removedDemoSets = savedSets.filter(isRemovedDemoSet);
    await Promise.all(removedDemoSets.map((set) => deleteSavedSet(set.id)));
    const currentSets = savedSets.filter((set) => !isRemovedDemoSet(set));
    if (currentSets.length > 0 || savedSets.length > 0) {
      replaceAllCardSets(currentSets);
      setAllSets(currentSets);
      setActiveCardSet((current) =>
        currentSets.find((set) => set.id === current.id) || currentSets[0] || EMPTY_CARD_SET
      );
      return;
    }

    const existingSets = getAllCardSets();
    for (const set of existingSets) {
      await writeSavedSet(set);
    }
  };

  useEffect(() => {
    if (!isTauriApp()) return;

    let cancelled = false;
    const initialize = async () => {
      try {
        const status = await initializeSetsStorage();
        if (cancelled) return;
        if (status.ready && status.activePath) {
          await finishSetsStorageSetup(status.activePath);
        } else {
          setSetsStorageSetup(status);
        }
      } catch (error) {
        reportAppError(error, 'Sets-Speicher konnte nicht eingerichtet werden');
        if (!cancelled) {
          setSetsStorageError(
            `Der Sets-Ordner konnte nicht eingerichtet werden: ${String(error)}`
          );
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const acceptSuggestedSetsFolder = async () => {
    setIsSettingUpSetsStorage(true);
    try {
      const path = await acceptSuggestedSetsStorage();
      await finishSetsStorageSetup(path);
    } catch (error) {
      reportAppError(error, 'Vorgeschlagener Sets-Ordner konnte nicht verwendet werden');
      setSetsStorageError(`Der vorgeschlagene Sets-Ordner konnte nicht verwendet werden: ${String(error)}`);
    } finally {
      setIsSettingUpSetsStorage(false);
    }
  };

  const chooseSetsFolder = async () => {
    setIsSettingUpSetsStorage(true);
    try {
      const path = await chooseSetsStorage();
      if (path) await finishSetsStorageSetup(path);
    } catch (error) {
      reportAppError(error, 'Ausgewählter Sets-Ordner konnte nicht verwendet werden');
      setSetsStorageError(`Der ausgewählte Sets-Ordner konnte nicht verwendet werden: ${String(error)}`);
    } finally {
      setIsSettingUpSetsStorage(false);
    }
  };

  // Keep html class in sync with theme state
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setStoredTheme(next);
  };

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Navigation handlers
  const navigateTo = (tab: ActiveTab) => {
    setNavHistory((prev) => [...prev, tab]);
    setActiveTab(tab);
  };

  const handleGoBack = () => {
    if (navHistory.length > 1) {
      const updated = [...navHistory];
      updated.pop(); // Remove current
      const target = updated[updated.length - 1] || 'menu';
      setNavHistory(updated);
      setActiveTab(target);
    } else {
      setActiveTab('menu');
      setNavHistory(['menu']);
    }
  };

  const handleGoHome = () => {
    setNavHistory(['menu']);
    setActiveTab('menu');
  };

  const openGameSetup = (mode: GameSetupConfig['mode']) => {
    if (allSets.length === 0) {
      navigateTo('sets');
      return;
    }
    setGameSetupConfig({ mode });
  };

  const openTrainerSetup = (mode: 'recall' | 'drawing') => {
    if (allSets.length === 0) {
      navigateTo('sets');
      return;
    }
    setTrainerSetupMode(mode);
  };

  // Launch a game from the GameSetupModal
  const handleStartConfiguredGame = (params: {
    cardSet: CardSet;
    pairsCount: number;
    activeProperties: string[];
    boardDisplayMode: BoardDisplayMode;
    gameVariant: GameVariant;
    gameMode: GameMode;
    versusPlayer1Name?: string;
    versusPlayer2Name?: string;
  }) => {
    setActiveCardSet(params.cardSet);
    setCustomPairsCount(params.pairsCount);
    setActiveProperties(params.activeProperties);
    setBoardDisplayMode(params.boardDisplayMode);
    setGameVariant(params.gameVariant);
    setGameMode(params.gameMode);
    if (params.versusPlayer1Name) setVersusPlayer1Name(params.versusPlayer1Name);
    if (params.versusPlayer2Name) setVersusPlayer2Name(params.versusPlayer2Name);
    setVersusStartingPlayer(1);
    setGameSetupConfig(null);
    setGameKey((k) => k + 1);
    setIsVictoryOpen(false);
    navigateTo('game');
  };

  const handleStartNewGame = (startingPlayer?: 1 | 2) => {
    if (startingPlayer) {
      setVersusStartingPlayer(startingPlayer);
    }
    setGameKey((k) => k + 1);
    setIsVictoryOpen(false);
    navigateTo('game');
  };

  const handleSaveSet = (savedSet: CardSet) => {
    if (!saveCardSet(savedSet)) {
      setSetsStorageError('Das Kartenset konnte nicht im lokalen App-Speicher gespeichert werden.');
      reportAppError('Das Kartenset konnte nicht im lokalen App-Speicher gespeichert werden.', 'Kartenset speichern');
      return;
    }
    const updated = getAllCardSets();
    setAllSets(updated);
    if (activeCardSet.id === savedSet.id) {
      setActiveCardSet(savedSet);
    }
    setEditingSet(null);
    if (isTauriApp() && setsStoragePath) {
      void writeSavedSet(savedSet).then(
        () => setSetsStorageError(null),
        (error: unknown) => {
          reportAppError(error, 'Kartenset-Datei konnte nicht gespeichert werden');
          setSetsStorageError(`Das Set konnte nicht im Sets-Ordner gespeichert werden: ${String(error)}`)
        }
      );
    }
  };

  const handleDeleteSet = (setId: string) => {
    deleteCardSet(setId);
    const updated = getAllCardSets();
    setAllSets(updated);
    if (activeCardSet.id === setId) {
      setActiveCardSet(updated[0] || EMPTY_CARD_SET);
    }
    if (isTauriApp() && setsStoragePath) {
      void deleteSavedSet(setId).then(
        () => setSetsStorageError(null),
        (error: unknown) => {
          reportAppError(error, 'Kartenset-Datei konnte nicht gelöscht werden');
          setSetsStorageError(`Die Set-Datei konnte nicht aus dem Sets-Ordner entfernt werden: ${String(error)}`)
        }
      );
    }
  };

  const handleEditSet = (set: CardSet) => {
    setEditingSet(set);
    navigateTo('editor');
  };

  const handleImportSuccess = (imported: CardSet[]) => {
    const updated = getAllCardSets();
    setAllSets(updated);
    if (imported.length > 0) {
      setActiveCardSet(imported[0]);
    }
    if (isTauriApp() && setsStoragePath) {
      void Promise.all(imported.map((set) => writeSavedSet(set))).then(
        () => setSetsStorageError(null),
        (error: unknown) => {
          reportAppError(error, 'Importierte Kartensets konnten nicht gespeichert werden');
          setSetsStorageError(`Importierte Sets konnten nicht im Sets-Ordner gespeichert werden: ${String(error)}`)
        }
      );
    }
  };

  const handleClearHighscores = () => {
    clearHighscores();
    setHighscores([]);
  };

  const handleGameComplete = (stats: {
    timeSeconds: number;
    moves: number;
    versusWinner: { name: string; score: number } | null;
    versusDetails?: {
      player1: { name: string; score: number };
      player2: { name: string; score: number };
      winnerPlayer: 1 | 2 | 'draw';
      loserPlayer: 1 | 2 | null;
    };
  }) => {
    setLastGameStats(stats);
    setIsVictoryOpen(true);
    setPlayerStats(getPlayerStats());
  };

  const allAvailableSets = allSets;
  return (
    <div
      className={`min-h-[100dvh] flex flex-col transition-colors duration-200 ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Streamlined Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onGoHome={handleGoHome}
        onGoBack={handleGoBack}
        canGoBack={activeTab !== 'menu'}
        onOpenTour={() => setIsTourOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        isMuted={isMuted}
        toggleMute={toggleMute}
      />

      {setsStorageError && (
        <div
          role="alert"
          className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-7xl rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-100"
        >
          {setsStorageError}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {/* 1. Hauptmenü (Spiele-Ausgangspunkt) */}
        {activeTab === 'menu' && (
          <MainMenu
            onStartClassicOriginal={() => openGameSetup('classic-original')}
            onStartClassicExtended={() => openGameSetup('classic-extended')}
            onStartOpenLearning={() => openGameSetup('open')}
            onOpenRecall={() => openTrainerSetup('recall')}
            onOpenDrawing={() => openTrainerSetup('drawing')}
            onOpenSets={() => navigateTo('sets')}
            onOpenEditor={() => {
              setEditingSet(null);
              navigateTo('editor');
            }}
            onOpenLeaderboard={() => navigateTo('leaderboard')}
            onOpenStats={() => navigateTo('stats')}
            stats={playerStats}
            allSets={allAvailableSets}
          />
        )}

        {/* 2. Spielbrett (Klassisch oder Offener Lernmodus) */}
        {activeTab === 'game' && (
          <GameBoard
            key={`game-${gameKey}-${activeCardSet.id}-${customPairsCount}-${gameMode}-${boardDisplayMode}`}
            cardSet={activeCardSet}
            difficulty={difficulty}
            customPairsCount={customPairsCount}
            gameVariant={gameVariant}
            initialActiveProperties={activeProperties.length >= 2 ? activeProperties : undefined}
            gameMode={gameMode}
            boardDisplayMode={boardDisplayMode}
            versusPlayer1Name={versusPlayer1Name}
            versusPlayer2Name={versusPlayer2Name}
            initialActivePlayer={versusStartingPlayer}
            onGameComplete={handleGameComplete}
            theme={theme}
          />
        )}

        {/* 3. Selbstabfrage (Active Recall) */}
        {activeTab === 'recall' && (
          <ActiveRecallTrainer
            cardSet={activeCardSet}
            onExit={handleGoBack}
          />
        )}

        {/* 4. Zeichenmodus (Freihand-Skizze) */}
        {activeTab === 'drawing' && (
          <DrawingTrainer
            cardSet={activeCardSet}
            onExit={handleGoBack}
            theme={theme}
          />
        )}

        {/* 5. Lernkarten: Kartensets */}
        {activeTab === 'sets' && (
          <CardSetSelector
            allSets={allSets}
            setsDirectory={setsStoragePath}
            onSelectSet={(set) => {
              setActiveCardSet(set);
              setGameSetupConfig({ mode: 'classic-original' });
            }}
            onSelectRecall={(set) => {
              setActiveCardSet(set);
              navigateTo('recall');
            }}
            onSelectDrawing={(set) => {
              setActiveCardSet(set);
              navigateTo('drawing');
            }}
            onCreateNewSet={() => {
              setEditingSet(null);
              navigateTo('editor');
            }}
            onEditSet={handleEditSet}
            onDeleteSet={handleDeleteSet}
            onImportSuccess={handleImportSuccess}
          />
        )}

        {/* 6. Lernkarten: Set-Editor */}
        {activeTab === 'editor' && (
          <CustomSetEditor
            key={editingSet ? editingSet.id : 'new-custom-set'}
            initialSet={editingSet}
            onSave={(saved) => {
              handleSaveSet(saved);
              navigateTo('sets');
            }}
            onCancel={() => {
              setEditingSet(null);
              handleGoBack();
            }}
            onPlayDirectly={(saved) => {
              handleSaveSet(saved);
              setActiveCardSet(saved);
              setCustomPairsCount(Math.min(8, saved.pairs.length));
              handleStartNewGame();
            }}
          />
        )}

        {/* 7. Wertung: Bestenliste */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            highscores={highscores}
            onClearHighscores={handleClearHighscores}
          />
        )}

        {/* 8. Wertung: Lernstatus */}
        {activeTab === 'stats' && (
          <StatsView
            allSets={allAvailableSets}
            onStartPlaying={() => openGameSetup('open')}
          />
        )}
      </main>

      {/* Pre-Game Setup Modal (Konfiguration vor Rundenbeginn) */}
      {gameSetupConfig && activeCardSet.id && allSets.length > 0 && (
        <GameSetupModal
          isOpen={true}
          onClose={() => setGameSetupConfig(null)}
          config={gameSetupConfig}
          allSets={allAvailableSets}
          activeSet={activeCardSet}
          onStartGame={handleStartConfiguredGame}
        />
      )}

      {/* Trainer Set Selection Modal */}
      {trainerSetupMode && (
        <TrainerSetupModal
          isOpen={true}
          onClose={() => setTrainerSetupMode(null)}
          mode={trainerSetupMode}
          allSets={allAvailableSets}
          onStartTrainer={(chosenSet) => {
            setActiveCardSet(chosenSet);
            const target = trainerSetupMode;
            setTrainerSetupMode(null);
            if (target) navigateTo(target);
          }}
        />
      )}

      {/* Victory Celebration Modal */}
      {isVictoryOpen && (
        <VictoryModal
          isOpen={true}
          onRestart={handleStartNewGame}
          onGoToMainMenu={() => {
            setIsVictoryOpen(false);
            handleGoHome();
          }}
          onChangeSet={() => {
            setIsVictoryOpen(false);
            navigateTo('sets');
          }}
          onGoToLeaderboard={() => {
            setIsVictoryOpen(false);
            setHighscores(getHighscores());
            navigateTo('leaderboard');
          }}
          timeSeconds={lastGameStats.timeSeconds}
          moves={lastGameStats.moves}
          difficulty={difficulty}
          setId={activeCardSet.id}
          setName={activeCardSet.title}
          gameMode={gameMode}
          versusWinner={lastGameStats.versusWinner}
          versusDetails={lastGameStats.versusDetails}
        />
      )}

      {/* Interactive Info-Tour Modal */}
      {isTourOpen && (
        <InfoTourModal
          isOpen={true}
          onClose={() => setIsTourOpen(false)}
        />
      )}

      {setsStorageSetup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sets-storage-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl rounded-3xl border border-slate-300 bg-slate-50 p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="sets-storage-title" className="text-xl font-extrabold text-slate-950 dark:text-white">
              Speicherort für Kartensets
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Im Installationsordner kann PandaMatch keine Dateien schreiben:
              <span className="mt-1 block break-all font-mono text-xs">{setsStorageSetup.installPath}</span>
            </p>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
              Standardmäßig können deine Sets hier gespeichert werden:
              <span className="mt-1 block break-all font-mono text-xs">{setsStorageSetup.suggestedPath}</span>
              <span className="mt-2 block">Du kannst den Vorschlag annehmen oder einen anderen übergeordneten Ordner auswählen. Darin wird jeweils ein Ordner „Sets“ angelegt.</span>
            </p>
            {setsStorageError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {setsStorageError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void chooseSetsFolder()}
                disabled={isSettingUpSetsStorage}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Anderen Ordner wählen
              </button>
              <button
                type="button"
                onClick={() => void acceptSuggestedSetsFolder()}
                disabled={isSettingUpSetsStorage}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Vorschlag verwenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean, quiet Footer with Version Chip from tauri.conf.json */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <img
              src="/assets/aistudio/PandaMatch__Sticker.png"
              alt="PandaMatch Sticker Logo"
              className="w-5 h-5 rounded-md object-contain"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              PandaMatch · Lernen. Zuordnen. Verstehen.
            </span>
            <span
              title={`Version ${APP_VERSION} (aus tauri.conf.json)`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs"
            >
              <span>v{APP_VERSION}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <KoFiButton variant="compact" />
          </div>
        </div>
      </footer>
    </div>
  );
}
