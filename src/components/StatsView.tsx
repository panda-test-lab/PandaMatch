import React, { useState, useMemo } from 'react';
import { CardSet, CardItem, CardPair } from '../types/memory';
import {
  getConceptMastery,
  classifyCardMastery,
  resetSetMastery,
} from '../utils/learningStorage';
import { LatexRenderer } from './LatexRenderer';
import { CardZoomModal } from './CardZoomModal';
import {
  BarChart2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Brain,
  ShieldCheck,
  Search,
  Filter,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';

interface StatsViewProps {
  allSets?: CardSet[];
  onStartPlaying: () => void;
}

type StatusFilter = 'all' | 'mastered' | 'uncertain' | 'incorrect' | 'new';

export const StatsView: React.FC<StatsViewProps> = ({
  allSets = [],
  onStartPlaying,
}) => {
  // Selected Card Set filter (empty string = "Alle Kartensets (kein Filter)")
  const [selectedSetFilter, setSelectedSetFilter] = useState<string>('');

  // Status classification filter
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilter>('all');

  // Text search query
  const [searchQuery, setSearchQuery] = useState('');

  // Card zoom inspection modal
  const [zoomedCard, setZoomedCard] = useState<CardItem | null>(null);

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statsVersion, setStatsVersion] = useState(0);

  // Compute all concepts under the selected set filter
  const filteredConcepts = useMemo(() => {
    // Force re-calculation on stats reset
    void statsVersion;

    const targetSets = selectedSetFilter
      ? allSets.filter((s) => s.id === selectedSetFilter)
      : allSets;

    const list: Array<{
      concept: CardPair;
      set: CardSet;
      mastery: ReturnType<typeof getConceptMastery>;
      classification: ReturnType<typeof classifyCardMastery>;
    }> = [];

    targetSets.forEach((set) => {
      set.pairs.forEach((pair) => {
        const mastery = getConceptMastery(pair.id, set.id);
        const classification = classifyCardMastery(mastery);

        // Apply Status Filter
        if (selectedStatusFilter !== 'all' && classification.status !== selectedStatusFilter) {
          return;
        }

        // Apply Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = pair.title.toLowerCase().includes(q);
          const matchesContentA = pair.cardA.content.toLowerCase().includes(q);
          const matchesContentB = pair.cardB.content.toLowerCase().includes(q);
          const matchesSetName = set.title.toLowerCase().includes(q);

          if (!matchesTitle && !matchesContentA && !matchesContentB && !matchesSetName) {
            return;
          }
        }

        list.push({
          concept: pair,
          set,
          mastery,
          classification,
        });
      });
    });

    return list;
  }, [allSets, selectedSetFilter, selectedStatusFilter, searchQuery, statsVersion]);

  // Aggregate statistics for the currently selected card set (or all sets)
  const summaryMetrics = useMemo(() => {
    void statsVersion;
    const targetSets = selectedSetFilter
      ? allSets.filter((s) => s.id === selectedSetFilter)
      : allSets;

    let total = 0;
    let masteredCount = 0;
    let uncertainCount = 0;
    let incorrectCount = 0;
    let newCount = 0;
    let totalReviews = 0;
    let totalCorrect = 0;

    targetSets.forEach((set) => {
      set.pairs.forEach((pair) => {
        total++;
        const mastery = getConceptMastery(pair.id, set.id);
        const classification = classifyCardMastery(mastery);

        if (classification.status === 'mastered') masteredCount++;
        else if (classification.status === 'uncertain') uncertainCount++;
        else if (classification.status === 'incorrect') incorrectCount++;
        else newCount++;

        if (mastery) {
          totalReviews += mastery.reviewCount;
          totalCorrect += mastery.correctCount;
        }
      });
    });

    const masteredPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    const uncertainPct = total > 0 ? Math.round((uncertainCount / total) * 100) : 0;
    const incorrectPct = total > 0 ? Math.round((incorrectCount / total) * 100) : 0;
    const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;
    const overallAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    return {
      total,
      masteredCount,
      masteredPct,
      uncertainCount,
      uncertainPct,
      incorrectCount,
      incorrectPct,
      newCount,
      newPct,
      totalReviews,
      overallAccuracy,
    };
  }, [allSets, selectedSetFilter, statsVersion]);

  const handleReset = () => {
    resetSetMastery(selectedSetFilter || undefined);
    setStatsVersion((v) => v + 1);
    setShowResetConfirm(false);
  };

  const handleZoomConcept = (item: { concept: CardPair; set: CardSet }) => {
    const { concept } = item;
    // Build CardItem representation for zoom inspection
    const zoomCard: CardItem = {
      id: concept.id,
      conceptId: concept.id,
      pairId: concept.id,
      propertyKey: 'A',
      propertyLabel: concept.cardA.label || 'Vorderseite',
      side: 'A',
      content: concept.cardA.content,
      type: concept.cardA.type,
      label: concept.title,
      isFlipped: true,
      isMatched: false,
      isSelected: false,
    };
    setZoomedCard(zoomCard);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 select-none">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Spaced Repetition & Behaltensleistung</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-emerald-500" />
            <span>Lernstatus & Gedächtnisanalytik</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Verfolge deinen Wissensstand in Echtzeit: Behalte den Überblick über sicher beherrschte Karten, unsichere Begriffe und gezielte Fehlerfokus-Karten.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowResetConfirm(true)}
            title="Lernstatus für den aktuellen Filter zurücksetzen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status zurücksetzen</span>
          </button>

          <button
            onClick={onStartPlaying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>Lernrunde starten</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div>
            <div className="font-bold text-sm">Lernfortschritt wirklich zurücksetzen?</div>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              {selectedSetFilter
                ? `Alle statistischen Auswertungen für „${allSets.find((s) => s.id === selectedSetFilter)?.title || 'dieses Set'}“ werden auf 0 gesetzt.`
                : 'Alle statistischen Auswertungen für ALLE Kartensets werden auf den Anfangszustand zurückgesetzt.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-900 font-bold hover:bg-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Ja, zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* FILTER BAR 1: Kartenset Filter (Standard: kein Filter) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>Kartenset-Filter (Standard: kein Filter)</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedSetFilter
              ? `Filter aktiv: 1 Set gewählt (${summaryMetrics.total} Karten)`
              : `Alle ${allSets.length} Sets aktiv (${summaryMetrics.total} Karten gesamt)`}
          </div>
        </div>

        {/* Set selection pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedSetFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSetFilter === ''
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-slate-200/80 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <span>🌐</span>
            <span>Alle Kartensets (kein Filter)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
              {allSets.reduce((acc, s) => acc + s.pairs.length, 0)}
            </span>
          </button>

          {allSets.map((s) => {
            const isSelected = selectedSetFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSetFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200/80 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-black/20 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {s.pairs.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI METRIC CARDS: 4 Learning Classifications */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Sehr gut erkannt (Grün) */}
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'mastered' ? 'all' : 'mastered')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedStatusFilter === 'mastered'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500 shadow-md'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-emerald-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sehr gut erkannt</span>
            </span>
            <span className="text-xs font-mono font-bold">{summaryMetrics.masteredPct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {summaryMetrics.masteredCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Sicher verankert (hohe Trefferquote, keine Fehler)
          </p>
        </div>

        {/* 2. Unsicher (Gelb) */}
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'uncertain' ? 'all' : 'uncertain')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedStatusFilter === 'uncertain'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500 shadow-md'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-amber-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Noch unsicher</span>
            </span>
            <span className="text-xs font-mono font-bold">{summaryMetrics.uncertainPct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {summaryMetrics.uncertainCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Mäßige Trefferquote oder Zögern/Geraten
          </p>
        </div>

        {/* 3. Häufig falsch (Rot) */}
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'incorrect' ? 'all' : 'incorrect')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedStatusFilter === 'incorrect'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500 shadow-md'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-rose-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Häufig falsch</span>
            </span>
            <span className="text-xs font-mono font-bold">{summaryMetrics.incorrectPct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {summaryMetrics.incorrectCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Wiederkehrende Fehler · Höchste Lernpriorität
          </p>
        </div>

        {/* 4. Noch nicht geübt (Grau) */}
        <div
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'new' ? 'all' : 'new')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedStatusFilter === 'new'
              ? 'bg-slate-200 dark:bg-slate-800 border-slate-500 ring-2 ring-slate-500 shadow-md'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-slate-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <Brain className="w-4 h-4" />
              <span>Noch nicht geübt</span>
            </span>
            <span className="text-xs font-mono font-bold">{summaryMetrics.newPct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {summaryMetrics.newCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Karten warten noch auf die erste Abfrage
          </p>
        </div>
      </div>

      {/* Visual Progress Bar Strip */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Gesamt-Verteilung im gewählten Filter</span>
          <span>{summaryMetrics.total} Karten</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
          {summaryMetrics.masteredCount > 0 && (
            <div
              style={{ width: `${(summaryMetrics.masteredCount / summaryMetrics.total) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`Sehr gut erkannt: ${summaryMetrics.masteredCount} (${summaryMetrics.masteredPct}%)`}
            />
          )}
          {summaryMetrics.uncertainCount > 0 && (
            <div
              style={{ width: `${(summaryMetrics.uncertainCount / summaryMetrics.total) * 100}%` }}
              className="h-full bg-amber-500 transition-all duration-300"
              title={`Unsicher: ${summaryMetrics.uncertainCount} (${summaryMetrics.uncertainPct}%)`}
            />
          )}
          {summaryMetrics.incorrectCount > 0 && (
            <div
              style={{ width: `${(summaryMetrics.incorrectCount / summaryMetrics.total) * 100}%` }}
              className="h-full bg-rose-500 transition-all duration-300"
              title={`Häufig falsch: ${summaryMetrics.incorrectCount} (${summaryMetrics.incorrectPct}%)`}
            />
          )}
          {summaryMetrics.newCount > 0 && (
            <div
              style={{ width: `${(summaryMetrics.newCount / summaryMetrics.total) * 100}%` }}
              className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-300"
              title={`Noch nicht geübt: ${summaryMetrics.newCount} (${summaryMetrics.newPct}%)`}
            />
          )}
        </div>
      </div>

      {/* SEARCH & STATUS TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Category Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs">
          <button
            onClick={() => setSelectedStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'all'
                ? 'bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alle ({summaryMetrics.total})
          </button>
          <button
            onClick={() => setSelectedStatusFilter('mastered')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedStatusFilter === 'mastered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sehr gut ({summaryMetrics.masteredCount})</span>
          </button>
          <button
            onClick={() => setSelectedStatusFilter('uncertain')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedStatusFilter === 'uncertain'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unsicher ({summaryMetrics.uncertainCount})</span>
          </button>
          <button
            onClick={() => setSelectedStatusFilter('incorrect')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedStatusFilter === 'incorrect'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:text-rose-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Häufig falsch ({summaryMetrics.incorrectCount})</span>
          </button>
          <button
            onClick={() => setSelectedStatusFilter('new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedStatusFilter === 'new'
                ? 'bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Neu ({summaryMetrics.newCount})
          </button>
        </div>

        {/* Text Search Box */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Karten durchsuchen..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* CARD EXPLORER GRID: Display individual cards marked with status */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>{filteredConcepts.length} Karten angezeigt</span>
          {selectedStatusFilter !== 'all' && (
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Filter aufheben
            </button>
          )}
        </div>

        {filteredConcepts.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center p-6">
            <Brain className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Keine Karten für diesen Filter gefunden
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Passe deine Filterkriterien an oder starte eine Lernrunde, um neue Daten zu sammeln.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredConcepts.map(({ concept, set, mastery, classification }) => {
              return (
                <div
                  key={`${set.id}-${concept.id}`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all group"
                >
                  {/* Top Bar: Set Badge & Status Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      <span>{set.icon}</span>
                      <span className="truncate">{set.title}</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0 ${classification.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${classification.dotClass}`} />
                      <span>{classification.label}</span>
                    </span>
                  </div>

                  {/* Card Visual Content & Title */}
                  <div className="flex items-center gap-3 py-1">
                    {/* Visual Preview Box */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden text-center">
                      {concept.cardA.type === 'latex' ? (
                        <LatexRenderer latex={concept.cardA.content} displayMode={false} className="text-xs" />
                      ) : concept.cardA.type === 'svg' ? (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: concept.cardA.content }}
                        />
                      ) : concept.cardA.type === 'image' ? (
                        <img
                          src={concept.cardA.content}
                          alt={concept.title}
                          className="w-full h-full object-contain"
                        />
                      ) : concept.cardA.type === 'emoji' ? (
                        <span className="text-2xl">{concept.cardA.content}</span>
                      ) : (
                        <span className="text-xs font-bold truncate">{concept.cardA.content}</span>
                      )}
                    </div>

                    {/* Concept Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white truncate">
                        {concept.title}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {concept.cardB.content}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Stats Footer */}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    {mastery && mastery.reviewCount > 0 ? (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">
                          <strong className="text-emerald-600 dark:text-emerald-400">{mastery.correctCount}✓</strong>
                          {' · '}
                          <strong className="text-rose-600 dark:text-rose-400">{mastery.incorrectCount}✕</strong>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {classification.accuracyPercentage}% Quote
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">Bisher noch nicht abgefragt</span>
                    )}

                    <button
                      onClick={() => handleZoomConcept({ concept, set })}
                      title="Karte vergrößern & inspizieren"
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scientific Reference Section (Kept intact from original design) */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Wissenschaftliche Grundlagen der Spaced-Repetition-Einteilung
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              MemoMaster unterscheidet gezielt zwischen sicherem Wissen, unsicheren Begriffen und wiederkehrenden Fehlern.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Sehr gut erkannt</span>
              </div>
              <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                Mehrfach korrekt und zügig abgerufen. Die Karte wandert im Abfragezyklus nach hinten und wird in größeren zeitlichen Abständen wiederholt.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Noch unsicher</span>
              </div>
              <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                Erst nach Zögern oder mit Unsicherheitsmeldung gelöst. Verbleibt in mittlerer Wiederholungsfrequenz.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm mb-1">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Häufig falsch</span>
              </div>
              <p className="text-xs text-rose-950 dark:text-rose-200 leading-relaxed">
                Wiederholt falsch zugeordnet. Erhält die höchste Prioritätsstufe und erscheint im Spiel signifikant häufiger zur Fehlerkorrektur.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Inspection Zoom Modal */}
      <CardZoomModal card={zoomedCard} onClose={() => setZoomedCard(null)} />
    </div>
  );
};
