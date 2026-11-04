import React, { useState } from 'react';
import { HighscoreEntry, Difficulty } from '../types/memory';
import { DIFFICULTIES } from '../data/difficulties';
import { Trophy, Medal, Trash2, ArrowUpDown } from 'lucide-react';

interface LeaderboardViewProps {
  highscores: HighscoreEntry[];
  onClearHighscores: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  highscores,
  onClearHighscores,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'moves'>('score');

  const filteredScores = highscores
    .filter((entry) => {
      if (selectedDifficulty === 'all') return true;
      return entry.difficulty === selectedDifficulty;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'time') return a.timeSeconds - b.timeSeconds;
      return a.moves - b.moves;
    });

  const topThree = filteredScores.slice(0, 3);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>Lokale Bestenliste</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Deine besten Ergebnisse aller Zeiten, lokal auf diesem Gerät gespeichert.
          </p>
        </div>

        {highscores.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Möchtest du wirklich alle Highscores zurücksetzen?')) {
                onClearHighscores();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bestenliste zurücksetzen</span>
          </button>
        )}
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-xs">
        {/* Difficulty Filter */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl">
          <button
            onClick={() => setSelectedDifficulty('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedDifficulty === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Alle Grade
          </button>
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedDifficulty === d
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {DIFFICULTIES[d].label}
            </button>
          ))}
        </div>

        {/* Sort criteria */}
        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Sortieren nach:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'time' | 'moves')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
          >
            <option value="score">Punktzahl (Höchste zuerst)</option>
            <option value="time">Schnellste Zeit</option>
            <option value="moves">Wenigste Züge</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium (if we have scores) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((entry, index) => {
            const medalColors = [
              'from-amber-500/15 to-transparent border-amber-500/50 text-amber-500',
              'from-slate-600/20 to-transparent border-slate-600/60 text-slate-300',
              'from-amber-800/20 to-transparent border-amber-700/50 text-amber-600',
            ];
            const medalLabels = ['1. Platz · Gold', '2. Platz · Silber', '3. Platz · Bronze'];

            return (
              <div
                key={entry.id}
                className={`p-5 rounded-2xl border border-slate-300 dark:border-slate-800 bg-gradient-to-b ${medalColors[index]} bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {medalLabels[index]}
                    </span>
                    <Medal className="w-5 h-5 fill-current" />
                  </div>

                  <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white truncate">
                    {entry.playerName}
                  </h3>

                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {entry.setName} · {DIFFICULTIES[entry.difficulty]?.label}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Punkte</span>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {entry.score.toLocaleString('de-DE')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Zeit / Züge</span>
                    <div className="text-xs text-slate-800 dark:text-slate-200 tabular-nums font-semibold">
                      {formatTime(entry.timeSeconds)} · {entry.moves} Züge
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard Table */}
      {filteredScores.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Trophy className="w-10 h-10 text-slate-400 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">
            Noch keine Einträge vorhanden
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Spiele eine Runde Memory, um dich in die Bestenliste einzutragen!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rang</th>
                <th className="py-3 px-4">Spieler</th>
                <th className="py-3 px-4">Kartenset</th>
                <th className="py-3 px-4">Schwierigkeit</th>
                <th className="py-3 px-4 text-center">Züge</th>
                <th className="py-3 px-4 text-center">Zeit</th>
                <th className="py-3 px-4 text-right">Punkte</th>
                <th className="py-3 px-4 text-right text-slate-400">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-normal">
              {filteredScores.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-100/80 dark:hover:bg-slate-900/80 transition-colors"
                >
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {entry.playerName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {entry.setName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {DIFFICULTIES[entry.difficulty]?.label || entry.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {entry.moves}
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatTime(entry.timeSeconds)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {entry.score.toLocaleString('de-DE')}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-400 font-mono">
                    {entry.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
