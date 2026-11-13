import React, { useState, useEffect, useMemo } from 'react';
import { CardSet, CardProperty, CardItem, CardContentType } from '../types/memory';
import { recordConceptReview, sampleWeightedConcepts, getSetMasterySummary } from '../utils/learningStorage';
import { sound } from '../utils/sound';
import { CardZoomModal } from './CardZoomModal';
import { LatexRenderer } from './LatexRenderer';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Award,
  ZoomIn,
  ArrowRight,
  Shuffle,
} from 'lucide-react';

interface ActiveRecallTrainerProps {
  cardSet: CardSet;
  onExit: () => void;
}

interface ChoiceItem {
  conceptId: string;
  content: string;
  type: CardContentType;
}

interface RecallStepData {
  conceptId: string;
  conceptTitle: string;
  promptProp: CardProperty;
  targetProp: CardProperty;
  choices: ChoiceItem[];
}

export const ActiveRecallTrainer: React.FC<ActiveRecallTrainerProps> = ({
  cardSet,
  onExit,
}) => {
  const [deck, setDeck] = useState<RecallStepData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<{
    correct: number;
    uncertain: number;
    incorrect: number;
  }>({ correct: 0, uncertain: 0, incorrect: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [zoomedCard, setZoomedCard] = useState<CardItem | null>(null);

  // Available property keys
  const availableProperties = useMemo(() => {
    if (cardSet.availableProperties && cardSet.availableProperties.length >= 2) {
      return cardSet.availableProperties;
    }
    return [
      { key: 'A', label: '1. Frage / Vorderseite' },
      { key: 'B', label: '2. Antwort / Rückseite' },
    ];
  }, [cardSet]);

  const [promptKey, setPromptKey] = useState<string>(() => availableProperties[0].key);
  const [targetKey, setTargetKey] = useState<string>(() => availableProperties[1].key);
  const [shuffleCards, setShuffleCards] = useState(true);

  // Target options: Exclude the currently selected promptKey so "Gegeben" and "Gesucht" are NEVER identical
  const targetOptions = useMemo(() => {
    return availableProperties.filter((p) => p.key !== promptKey);
  }, [availableProperties, promptKey]);

  // Handle promptKey change: automatically adjust targetKey if it matches
  const handlePromptKeyChange = (newPromptKey: string) => {
    setPromptKey(newPromptKey);
    if (targetKey === newPromptKey) {
      const nextTarget = availableProperties.find((p) => p.key !== newPromptKey);
      if (nextTarget) {
        setTargetKey(nextTarget.key);
      }
    }
  };

  // Build deck with Spaced Repetition sampling
  const initSession = () => {
    const rawPairs = cardSet.pairs;
    if (rawPairs.length === 0) return;

    // Pick cards using weighted sampling (struggling cards appear more often)
    const sampledConcepts = sampleWeightedConcepts(rawPairs, Math.min(10, rawPairs.length), cardSet.id);

    const steps: RecallStepData[] = sampledConcepts.map((concept) => {
      // Find prompt property
      const promptProp: CardProperty =
        concept.properties?.[promptKey] || (promptKey === 'A' ? {
          id: `${concept.id}_A`,
          key: 'A',
          label: concept.cardA.label || 'Gegeben',
          content: concept.cardA.content,
          type: concept.cardA.type,
        } : {
          id: `${concept.id}_B`,
          key: 'B',
          label: concept.cardB.label || 'Gegeben',
          content: concept.cardB.content,
          type: concept.cardB.type,
        });

      // Find target answer property
      const targetProp: CardProperty =
        concept.properties?.[targetKey] || (targetKey === 'B' ? {
          id: `${concept.id}_B`,
          key: 'B',
          label: concept.cardB.label || 'Gesucht',
          content: concept.cardB.content,
          type: concept.cardB.type,
        } : {
          id: `${concept.id}_A`,
          key: 'A',
          label: concept.cardA.label || 'Gesucht',
          content: concept.cardA.content,
          type: concept.cardA.type,
        });

      // Distractors for multiple-choice
      const otherConcepts = rawPairs.filter((p) => p.id !== concept.id);
      const shuffledOthers = [...otherConcepts].sort(() => Math.random() - 0.5);
      const distractorPicks = shuffledOthers.slice(0, 3);

      const allChoices: ChoiceItem[] = [
        {
          conceptId: concept.id,
          content: targetProp.content,
          type: targetProp.type,
        },
        ...distractorPicks.map((d) => {
          const dProp = d.properties?.[targetKey] || (targetKey === 'B' ? d.cardB : d.cardA);
          return {
            conceptId: d.id,
            content: dProp.content,
            type: dProp.type,
          };
        }),
      ].sort(() => Math.random() - 0.5);

      return {
        conceptId: concept.id,
        conceptTitle: concept.title,
        promptProp,
        targetProp,
        choices: allChoices,
      };
    });

    if (shuffleCards) {
      for (let i = steps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [steps[i], steps[j]] = [steps[j], steps[i]];
      }
    } else {
      const pairOrder = new Map(rawPairs.map((pair, index) => [pair.id, index]));
      steps.sort((a, b) => (pairOrder.get(a.conceptId) ?? 0) - (pairOrder.get(b.conceptId) ?? 0));
    }

    setDeck(steps);
    setCurrentIndex(0);
    setSelectedChoiceId(null);
    setSessionResults({ correct: 0, uncertain: 0, incorrect: 0 });
    setIsSessionFinished(false);
  };

  useEffect(() => {
    initSession();
  }, [cardSet, promptKey, targetKey, shuffleCards]);

  const currentItem = deck[currentIndex];
  const summary = getSetMasterySummary(
    cardSet.id,
    cardSet.pairs.map((p) => p.id)
  );

  // Advance to next card or complete session
  const handleAdvanceNext = () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedChoiceId(null);
    } else {
      setIsSessionFinished(true);
    }
  };

  // User selects an answer FIRST!
  const handleChoiceSelect = (choiceConceptId: string) => {
    if (selectedChoiceId) return; // already chosen
    setSelectedChoiceId(choiceConceptId);

    const isMatch = choiceConceptId === currentItem.conceptId;
    if (isMatch) {
      sound.playMatch();
    } else {
      sound.playMismatch();
      // AUTOMATICALLY record 'incorrect' - user does not need to self-rate mistakes!
      recordConceptReview(cardSet.id, currentItem.conceptId, 'incorrect');
      setSessionResults((prev) => ({
        ...prev,
        incorrect: prev.incorrect + 1,
      }));
    }
  };

  // User rates self-assessment when correct (Sicher vs Unsicher)
  const handleRateAssessment = (rating: 'correct' | 'uncertain') => {
    if (!currentItem) return;

    recordConceptReview(cardSet.id, currentItem.conceptId, rating);

    setSessionResults((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    if (rating === 'correct') sound.playMatch();
    else sound.playPeek();

    handleAdvanceNext();
  };

  const renderContentVisual = (content: string, type: CardContentType, title?: string) => {
    if (type === 'latex') {
      return (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-slate-950 dark:text-white overflow-hidden">
          <LatexRenderer latex={content} displayMode={true} className="text-xl sm:text-2xl text-[clamp(0.75rem,8cqi,1.5rem)] max-w-full overflow-hidden" />
        </div>
      );
    }
    if (type === 'svg') {
      return (
        <div
          className="recall-card-svg w-full h-full flex items-center justify-center p-2 text-slate-950 dark:text-white"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    if (type === 'image') {
      return (
        <img
          src={content}
          alt={title || 'Abbildung'}
          className="w-full h-full object-contain rounded-lg"
        />
      );
    }
    if (type === 'emoji') {
      return <span className="text-7xl sm:text-8xl select-none" style={{ fontSize: 'clamp(2rem, 55cqi, 5rem)' }}>{content}</span>;
    }
    return (
      <span
        className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white px-2 break-words"
        style={{ fontSize: 'clamp(0.75rem, 8cqi, 1.5rem)' }}
      >
        {content}
      </span>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white">
              Selbstabfrage-Modus (Active Recall)
            </h1>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {cardSet.title} · Erst Antwort wählen, danach Richtigkeit prüfen & bewerten
            </p>
          </div>
        </div>

        {/* Mastery Overview Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Lernfortschritt</div>
            <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {summary.masteredCount} / {summary.total} ({summary.percentage}% gemeistert)
            </div>
          </div>
          <button
            onClick={onExit}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-950 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Zurück zum Spiel
          </button>
        </div>
      </div>

      {/* Property Configuration Bar: Gegeben vs. Gesucht (NEVER EQUAL!) */}
      {availableProperties.length >= 2 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-950 dark:text-slate-200">Gegeben:</span>
            <select
              value={promptKey}
              onChange={(e) => handlePromptKeyChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900 font-bold text-slate-950 dark:text-slate-100 shadow-xs cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {availableProperties.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-950 dark:text-slate-200">Gesucht:</span>
            <select
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900 font-bold text-slate-950 dark:text-slate-100 shadow-xs cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              {targetOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2.5 self-start rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
        <input
          type="checkbox"
          checked={shuffleCards}
          onChange={(e) => setShuffleCards(e.target.checked)}
          className="accent-emerald-600"
        />
        <Shuffle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Zufällige Kartenreihenfolge</span>
      </label>

      {/* Finished Summary or Active Card */}
      {isSessionFinished ? (
        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-xl text-center flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Wiederholungsrunde abgeschlossen!
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-md">
            Deine Selbsteinschätzungen wurden im Spaced-Repetition-System gespeichert. Unsichere oder falsche
            Karten werden in Folgerunden bevorzugt vorgelegt.
          </p>

          <div className="grid grid-cols-3 gap-3 my-6 w-full max-w-sm">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {sessionResults.correct}
              </div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Sicher</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {sessionResults.uncertain}
              </div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">Unsicher</div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
              <XCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
              <div className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {sessionResults.incorrect}
              </div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Falsch</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={initSession}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nächste Runde starten (Spaced Repetition)</span>
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Zurück zum Spiel
            </button>
          </div>
        </div>
      ) : currentItem ? (
        <div className="flex flex-col gap-5">
          {/* Progress Strip */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
            <span>
              Karte {currentIndex + 1} von {deck.length}
            </span>
            <div className="w-36 sm:w-56 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / deck.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Prompt Card (Gegeben) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md flex flex-col items-center text-center">
            <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
              Gegeben: {currentItem.promptProp.label}
            </div>

            {/* Visual Box */}
            <div className="recall-prompt-visual w-full max-w-[280px] sm:max-w-[340px] aspect-square rounded-2xl border-2 border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-3 shadow-inner my-2 overflow-hidden relative group">
              <button
                type="button"
                onClick={() =>
                  setZoomedCard({
                    id: currentItem.conceptId,
                    conceptId: currentItem.conceptId,
                    pairId: currentItem.conceptId,
                    propertyKey: currentItem.promptProp.key,
                    propertyLabel: currentItem.promptProp.label,
                    side: 'A',
                    content: currentItem.promptProp.content,
                    type: currentItem.promptProp.type,
                    label: currentItem.conceptTitle,
                    isFlipped: true,
                    isMatched: false,
                  })
                }
                title="Vergrößern (Zoom)"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-300 hover:text-emerald-600 transition-colors shadow-xs cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {renderContentVisual(
                currentItem.promptProp.content,
                currentItem.promptProp.type,
                currentItem.conceptTitle
              )}
            </div>

            {/* Instruction Prompt: User selects answer first! */}
            <div className="w-full mt-4 text-left border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white">
                  Gesucht: {currentItem.targetProp.label}
                </span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {selectedChoiceId === null
                    ? 'Wähle erst die passende Antwort aus:'
                    : 'Antwort ausgewertet:'}
                </span>
              </div>

              {/* 4 Multiple-Choice Options */}
              <div className="grid grid-cols-2 gap-2.5">
                {currentItem.choices.map((choice, cIdx) => {
                  const isTarget = choice.conceptId === currentItem.conceptId;
                  const isSelected = selectedChoiceId === choice.conceptId;

                  let btnStyle =
                    'border-2 border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-950 hover:border-emerald-600 hover:bg-slate-300 dark:hover:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-xs';

                  if (selectedChoiceId !== null) {
                    if (isTarget) {
                      // Correct answer: green highlight
                      btnStyle =
                        'border-2 border-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-100 font-extrabold shadow-sm ring-2 ring-emerald-500/50';
                    } else if (isSelected) {
                      // Chosen wrong answer: red highlight
                      btnStyle =
                        'border-2 border-rose-600 bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 font-bold line-through ring-2 ring-rose-500/50';
                    } else {
                      btnStyle =
                        'opacity-40 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={cIdx}
                      disabled={selectedChoiceId !== null}
                      onClick={() => handleChoiceSelect(choice.conceptId)}
                      className={`p-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${btnStyle}`}
                    >
                      {/* Status Checkmark / Cross after selection */}
                      {selectedChoiceId !== null && isTarget && (
                        <div className="absolute top-2 right-2 text-emerald-800 dark:text-emerald-400 font-extrabold text-xs flex items-center gap-0.5">
                          <span>✓ Richtig</span>
                        </div>
                      )}
                      {selectedChoiceId !== null && isSelected && !isTarget && (
                        <div className="absolute top-2 right-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs flex items-center gap-0.5">
                          <span>✕ Falsch</span>
                        </div>
                      )}

                      <div className="pr-12">
                        {choice.type === 'latex' ? (
                          <LatexRenderer latex={choice.content} displayMode={false} />
                        ) : choice.type === 'svg' ? (
                          <div
                            className="recall-card-svg w-10 h-10 flex items-center justify-center p-0.5"
                            dangerouslySetInnerHTML={{ __html: choice.content }}
                          />
                        ) : choice.type === 'image' ? (
                          <img
                            src={choice.content}
                            alt="Antwort"
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded"
                          />
                        ) : (
                          <span className="font-extrabold text-slate-950 dark:text-white">
                            {choice.content}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Reveal Solution & Self-Assessment: DISPLAYED ONLY AFTER SELECTION */}
              {selectedChoiceId !== null && (
                <div className="mt-5 p-4 rounded-2xl bg-slate-200/90 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 flex flex-col gap-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-800 pb-3">
                    <div>
                      <div className="text-[11px] uppercase font-extrabold tracking-wider text-emerald-700 dark:text-emerald-400">
                        Offizielle Lösung ({currentItem.targetProp.label}):
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">
                        {currentItem.targetProp.type === 'latex' ? (
                          <LatexRenderer latex={currentItem.targetProp.content} displayMode={false} />
                        ) : (
                          currentItem.targetProp.content
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Konzept:</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentItem.conceptTitle}
                      </div>
                    </div>
                  </div>

                  {/* Conditional Rating / Advance: If wrong answer, auto-marked as Falsch; if right answer, prompt for certainty */}
                  <div>
                    {selectedChoiceId !== currentItem.conceptId ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                        <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300 font-semibold text-xs sm:text-sm">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>
                            Falsch beantwortet – automatisch als <strong>„Falsch“</strong> im Lernstatus verbucht.
                          </span>
                        </div>
                        <button
                          onClick={handleAdvanceNext}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          <span>Nächste Karte</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center mb-2.5">
                          ✓ Richtige Antwort! Wie sicher warst du dir?
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <button
                            onClick={() => handleRateAssessment('uncertain')}
                            className="py-3 px-3 rounded-xl bg-amber-50 dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-xs sm:text-sm font-extrabold flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span>Noch unsicher / Geraten</span>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              In Übung halten
                            </span>
                          </button>

                          <button
                            onClick={() => handleRateAssessment('correct')}
                            className="py-3 px-3 rounded-xl bg-emerald-50 dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm font-extrabold flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Sicher gewusst!</span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Sicher gelernt (Seltener zeigen)
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail Zoom Modal */}
      <CardZoomModal card={zoomedCard} onClose={() => setZoomedCard(null)} />
    </div>
  );
};
