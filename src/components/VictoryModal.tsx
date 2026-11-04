import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award, ArrowRight, Check, Home, Users } from 'lucide-react';
import { Difficulty, GameMode } from '../types/memory';
import { DIFFICULTIES } from '../data/difficulties';
import { getStoredPlayerName, saveHighscore, setStoredPlayerName } from '../utils/storage';
import { sound } from '../utils/sound';

interface VictoryModalProps {
  isOpen: boolean;
  onRestart: (startingPlayer?: 1 | 2) => void;
  onGoToMainMenu: () => void;
  onChangeSet: () => void;
  onGoToLeaderboard: () => void;
  timeSeconds: number;
  moves: number;
  difficulty: Difficulty;
  setId: string;
  setName: string;
  gameMode: GameMode;
  versusWinner?: { name: string; score: number } | null;
  versusDetails?: {
    player1: { name: string; score: number };
    player2: { name: string; score: number };
    winnerPlayer: 1 | 2 | 'draw';
    loserPlayer: 1 | 2 | null;
  };
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onRestart,
  onGoToMainMenu,
  onChangeSet,
  onGoToLeaderboard,
  timeSeconds,
  moves,
  difficulty,
  setId,
  setName,
  gameMode,
  versusWinner,
  versusDetails,
}) => {
  const [playerName, setPlayerName] = useState(getStoredPlayerName());
  const [hasSaved, setHasSaved] = useState(false);

  // Versus Mode Player Inputs & Saved States
  const [p1Name, setP1Name] = useState(versusDetails?.player1.name || 'Spieler 1');
  const [p2Name, setP2Name] = useState(versusDetails?.player2.name || 'Spieler 2');
  const [hasSavedP1, setHasSavedP1] = useState(false);
  const [hasSavedP2, setHasSavedP2] = useState(false);

  const diffConfig = DIFFICULTIES[difficulty];
  const totalPairs = diffConfig.pairs;

  // Accuracy calculation: minimum possible moves is totalPairs
  const accuracy = Math.min(100, Math.round((totalPairs / Math.max(moves, totalPairs)) * 100));

  // Score formulas
  const diffMultiplier = { easy: 1, medium: 1.5, hard: 2, expert: 2.5, master: 3 }[difficulty];
  const timePenalty = Math.floor(timeSeconds * 3.5);
  const movesPenalty = (moves - totalPairs) * 25;
  const rawScore = Math.max(
    100,
    Math.round((1000 + totalPairs * 120 + accuracy * 5 - timePenalty - movesPenalty) * diffMultiplier)
  );

  // Versus individual score calculations
  const p1Pairs = versusDetails?.player1.score || 0;
  const p2Pairs = versusDetails?.player2.score || 0;
  const p1Score = Math.max(
    50,
    Math.round((450 + p1Pairs * 160 + accuracy * 4 - timePenalty * 0.4) * diffMultiplier)
  );
  const p2Score = Math.max(
    50,
    Math.round((450 + p2Pairs * 160 + accuracy * 4 - timePenalty * 0.4) * diffMultiplier)
  );

  useEffect(() => {
    if (isOpen) {
      sound.playVictory();
      setHasSaved(false);
      setHasSavedP1(false);
      setHasSavedP2(false);

      if (versusDetails) {
        setP1Name(versusDetails.player1.name);
        setP2Name(versusDetails.player2.name);
      }

      // Trigger confetti fireworks
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'],
        });

        const timer = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#10b981', '#f59e0b', '#3b82f6'],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10b981', '#f59e0b', '#3b82f6'],
          });
        }, 350);

        return () => clearTimeout(timer);
      } catch {
        // fallback
      }
    }
  }, [isOpen, versusDetails]);

  if (!isOpen) return null;

  const isVersus = gameMode === 'versus' && versusDetails;

  // Next round starter in versus mode: loser of this round starts
  const loserPlayer = versusDetails?.loserPlayer;
  const nextStarterPlayer: 1 | 2 = loserPlayer ? loserPlayer : (versusDetails?.winnerPlayer === 1 ? 2 : 1);
  const nextStarterName = nextStarterPlayer === 1 ? p1Name : p2Name;

  const handleSaveHighscoreSolo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || hasSaved) return;

    setStoredPlayerName(playerName.trim());
    saveHighscore({
      playerName: playerName.trim(),
      difficulty,
      setId,
      setName,
      moves,
      timeSeconds,
      score: rawScore,
      accuracy,
      date: new Date().toLocaleDateString('de-DE'),
      mode: 'solo',
    });
    setHasSaved(true);
  };

  const handleSaveP1 = () => {
    if (!p1Name.trim() || hasSavedP1) return;
    saveHighscore({
      playerName: p1Name.trim(),
      difficulty,
      setId,
      setName,
      moves,
      timeSeconds,
      score: p1Score,
      accuracy,
      date: new Date().toLocaleDateString('de-DE'),
      mode: 'versus',
    });
    setHasSavedP1(true);
  };

  const handleSaveP2 = () => {
    if (!p2Name.trim() || hasSavedP2) return;
    saveHighscore({
      playerName: p2Name.trim(),
      difficulty,
      setId,
      setName,
      moves,
      timeSeconds,
      score: p2Score,
      accuracy,
      date: new Date().toLocaleDateString('de-DE'),
      mode: 'versus',
    });
    setHasSavedP2(true);
  };

  const handleSaveBoth = () => {
    handleSaveP1();
    handleSaveP2();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-center">
        {/* Trophy Header Icon */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 dark:from-amber-500 dark:to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-950" />
        </div>

        {/* Dynamic Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
          {isVersus
            ? versusDetails.winnerPlayer === 'draw'
              ? 'Spannendes Duell: Unentschieden!'
              : `Glückwunsch, ${versusWinner?.name || (versusDetails.winnerPlayer === 1 ? p1Name : p2Name)} gewinnt!`
            : 'Hervorragend gelöst!'}
        </h2>

        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
          {setName} · {diffConfig.label} ({diffConfig.pairs} Paare)
        </p>

        {/* Scoreboard Area */}
        {isVersus ? (
          /* Versus Mode Scoreboard */
          <div className="my-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex flex-col gap-3">
            <div className="text-xs uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Duell-Ergebnis</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Player 1 Card */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  versusDetails.winnerPlayer === 1
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/60'
                }`}
              >
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {p1Name}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {p1Pairs} <span className="text-xs font-normal text-slate-500">Paare</span>
                </div>
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                  {p1Score} Pts
                </div>
                {versusDetails.winnerPlayer === 1 && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px]">
                    Gewinner 🏆
                  </span>
                )}
                {versusDetails.loserPlayer === 1 && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                    Beginnt nächste Runde
                  </span>
                )}
              </div>

              {/* Player 2 Card */}
              <div
                className={`p-3 rounded-2xl border text-center transition-all ${
                  versusDetails.winnerPlayer === 2
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/60'
                }`}
              >
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {p2Name}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {p2Pairs} <span className="text-xs font-normal text-slate-500">Paare</span>
                </div>
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
                  {p2Score} Pts
                </div>
                {versusDetails.winnerPlayer === 2 && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px]">
                    Gewinner 🏆
                  </span>
                )}
                {versusDetails.loserPlayer === 2 && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                    Beginnt nächste Runde
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Solo Mode Scoreboard */
          <div className="my-5 p-4 rounded-2xl bg-slate-200/60 dark:bg-slate-950 border border-slate-300 dark:border-slate-800">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
              Gesamtpunktzahl
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1">
              {rawScore.toLocaleString('de-DE')}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-300 dark:border-slate-800 pt-3 text-center">
              <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Korrekt</div>
                <div className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {totalPairs}/{totalPairs}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Versuche</div>
                <div className="text-sm font-extrabold font-mono text-slate-950 dark:text-white mt-0.5">
                  {moves}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Treffer</div>
                <div className="text-sm font-extrabold font-mono text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {accuracy}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Highscore Entry Area */}
        {isVersus ? (
          /* Versus Leaderboard Registration for BOTH players */
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>In die Bestenliste eintragen:</span>
              </span>

              {!hasSavedP1 && !hasSavedP2 && (
                <button
                  type="button"
                  onClick={handleSaveBoth}
                  className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Beide eintragen
                </button>
              )}
            </div>

            {/* Row Player 1 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Spieler 1 Name"
                maxLength={20}
                disabled={hasSavedP1}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              />
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 w-16 text-right">
                {p1Score} Pts
              </span>
              <button
                type="button"
                onClick={handleSaveP1}
                disabled={hasSavedP1 || !p1Name.trim()}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-colors cursor-pointer ${
                  hasSavedP1
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                {hasSavedP1 ? '✓ Gespeichert' : 'Eintragen'}
              </button>
            </div>

            {/* Row Player 2 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Spieler 2 Name"
                maxLength={20}
                disabled={hasSavedP2}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-16 text-right">
                {p2Score} Pts
              </span>
              <button
                type="button"
                onClick={handleSaveP2}
                disabled={hasSavedP2 || !p2Name.trim()}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-colors cursor-pointer ${
                  hasSavedP2
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                }`}
              >
                {hasSavedP2 ? '✓ Gespeichert' : 'Eintragen'}
              </button>
            </div>
          </div>
        ) : (
          /* Solo Highscore Entry Form */
          <form onSubmit={handleSaveHighscoreSolo} className="mb-5 text-left">
            <label htmlFor="player-name" className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1.5">
              In Bestenliste eintragen:
            </label>
            <div className="flex gap-2">
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Dein Spielername"
                maxLength={20}
                disabled={hasSaved}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={hasSaved || !playerName.trim()}
                className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  hasSaved
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                {hasSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Gespeichert</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5" />
                    <span>Eintragen</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Action Controls */}
        <div className="space-y-2">
          {/* Restart Button: In versus mode, automatic loser starts next */}
          <button
            onClick={() => onRestart(isVersus ? nextStarterPlayer : undefined)}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {isVersus
                ? `Erneut spielen (${nextStarterName} beginnt)`
                : 'Erneut spielen'}
            </span>
          </button>

          <button
            onClick={onGoToMainMenu}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Zurück zum Hauptmenü</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onChangeSet}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
            >
              Kartenset wechseln
            </button>
            <button
              onClick={onGoToLeaderboard}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Bestenliste</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
