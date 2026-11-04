import React, { useState, useEffect, useRef } from 'react';
import { CardSet, SelfAssessmentRating, CardProperty, CardContentType } from '../types/memory';
import { recordConceptReview, sampleWeightedConcepts, getSetMasterySummary } from '../utils/learningStorage';
import { sound } from '../utils/sound';
import { LatexRenderer } from './LatexRenderer';
import { getDrawingProperty } from '../utils/drawingMode';
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  Eraser,
  Trash2,
  ArrowRight,
} from 'lucide-react';

interface DrawingTrainerProps {
  cardSet: CardSet;
  onExit: () => void;
  theme: 'light' | 'dark';
}

interface DrawingStepData {
  conceptId: string;
  conceptTitle: string;
  promptProp: CardProperty;
  targetProp: CardProperty;
}

export const DrawingTrainer: React.FC<DrawingTrainerProps> = ({
  cardSet,
  onExit,
  theme,
}) => {
  const [deck, setDeck] = useState<DrawingStepData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionResults, setSessionResults] = useState<{
    correct: number;
    uncertain: number;
    incorrect: number;
  }>({ correct: 0, uncertain: 0, incorrect: 0 });
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [brushColor, setBrushColor] = useState<string>(theme === 'dark' ? '#f8fafc' : '#0f172a');
  const brushSize = 3;
  const [hasDrawn, setHasDrawn] = useState(false);

  // Sync brush color when theme switches so drawing is always visible
  useEffect(() => {
    setBrushColor(theme === 'dark' ? '#f8fafc' : '#0f172a');
  }, [theme]);

  // Initialize session with weighted Spaced Repetition concepts
  const initSession = () => {
    const rawPairs = cardSet.pairs.filter((pair) =>
      getDrawingProperty(pair, cardSet.availableProperties)
    );
    if (rawPairs.length === 0) return;

    const sampled = sampleWeightedConcepts(rawPairs, Math.min(10, rawPairs.length), cardSet.id);

    const steps: DrawingStepData[] = sampled.map((concept) => {
      // Prompt is usually the drug name / title
      const promptProp: CardProperty = {
        id: `${concept.id}_title`,
        key: 'title',
        label: 'Gesuchter Wirkstoff / Name',
        content: concept.title,
        type: 'text',
      };

      const targetProp = getDrawingProperty(concept, cardSet.availableProperties);
      if (!targetProp) return null;

      return {
        conceptId: concept.id,
        conceptTitle: concept.title,
        promptProp,
        targetProp,
      };
    }).filter((step): step is DrawingStepData => step !== null);

    setDeck(steps);
    setCurrentIndex(0);
    setIsRevealed(false);
    setHasDrawn(false);
    setSessionResults({ correct: 0, uncertain: 0, incorrect: 0 });
    setIsSessionFinished(false);
    clearCanvas();
  };

  useEffect(() => {
    initSession();
  }, [cardSet]);

  const currentItem = deck[currentIndex];
  const summary = getSetMasterySummary(
    cardSet.id,
    cardSet.pairs.map((p) => p.id)
  );

  // Canvas operations
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Fill background with light/dark neutral
    ctx.fillStyle = theme === 'dark' ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  useEffect(() => {
    clearCanvas();
  }, [currentIndex, theme]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = theme === 'dark' ? '#090d16' : '#f8fafc';
    } else {
      ctx.strokeStyle = brushColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // User submits drawing and reveals solution
  const handleRevealSolution = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    sound.playPeek();
  };

  // User rates self-assessment after comparison
  const handleRateAssessment = (rating: SelfAssessmentRating) => {
    if (!currentItem) return;

    recordConceptReview(cardSet.id, currentItem.conceptId, rating);

    setSessionResults((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    if (rating === 'correct') sound.playMatch();
    else if (rating === 'uncertain') sound.playPeek();
    else sound.playMismatch();

    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
      setIsRevealed(false);
      clearCanvas();
    } else {
      setIsSessionFinished(true);
    }
  };

  const renderTargetVisual = (content: string, type: CardContentType) => {
    if (type === 'latex') {
      return <LatexRenderer latex={content} displayMode={true} className="text-xl sm:text-2xl" />;
    }
    if (type === 'svg') {
      return (
        <div
          className="w-full h-full flex items-center justify-center p-2 text-slate-950 dark:text-white"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    if (type === 'image') {
      return (
        <img
          src={content}
          alt="Strukturformel"
          className="w-full h-full object-contain rounded-xl"
        />
      );
    }
    if (type === 'emoji') {
      return <span className="text-6xl sm:text-7xl select-none">{content}</span>;
    }
    return (
      <span className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white px-2">
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
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white">
              Zeichenmodus (Freihand-Skizze)
            </h1>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {cardSet.title} · Zeichne die Strukturformel frei von Hand und vergleiche sie
            </p>
          </div>
        </div>

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

      {/* Finished Summary or Active Drawing Card */}
      {isSessionFinished ? (
        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-xl text-center flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Zeichenrunde erfolgreich abgeschlossen!
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-md">
            Deine Skizzen-Selbsteinschätzungen wurden im Spaced-Repetition-System gespeichert. Unsichere Strukturen werden in Folgerunden bevorzugt vorgelegt.
          </p>

          <div className="grid grid-cols-3 gap-3 my-6 w-full max-w-sm">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {sessionResults.correct}
              </div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Richtig</div>
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
              <span>Nächste Zeichenrunde starten</span>
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
              Skizze {currentIndex + 1} von {deck.length}
            </span>
            <div className="w-36 sm:w-56 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / deck.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Prompt Card: Wirkstoffname */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md flex flex-col items-center text-center">
            <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
              Zeichne folgende Strukturformel:
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white my-2">
              {currentItem.promptProp.content}
            </div>
          </div>

          {/* Drawing Canvas Board */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Werkzeug:</span>
                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    tool === 'pen'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-slate-300'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Stift</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    tool === 'eraser'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-slate-300'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Radierer</span>
                </button>
              </div>

              {/* Color & Line Width */}
              <div className="flex items-center gap-3">
                {tool === 'pen' && (
                  <div className="flex items-center gap-1.5">
                    {[theme === 'dark' ? '#f8fafc' : '#0f172a', '#dc2626', '#2563eb', '#16a34a'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setBrushColor(col)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                          brushColor === col ? 'scale-125 border-emerald-500' : 'border-slate-400/50'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Löschen</span>
                </button>
              </div>
            </div>

            {/* Canvas Element */}
            <div className="relative w-full aspect-[36/19] rounded-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden cursor-crosshair shadow-inner bg-slate-200 dark:bg-slate-950">
              <canvas
                ref={canvasRef}
                width={720}
                height={380}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none"
              />
              {!hasDrawn && !isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-700 dark:text-slate-400 text-xs sm:text-sm font-bold bg-slate-200/50 dark:bg-slate-950/50">
                  <span>Zeichne hier mit Maus oder Touch (Tablet / Smartphone)</span>
                </div>
              )}
            </div>

            {/* Action Before Reveal */}
            {!isRevealed ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleRateAssessment('incorrect')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Wusste ich nicht / Überspringen
                </button>

                <button
                  type="button"
                  onClick={handleRevealSolution}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Fertig & Lösung vergleichen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Solution Comparison & Self-Assessment */
              <div className="mt-4 p-5 rounded-2xl bg-slate-200/80 dark:bg-slate-950 border-2 border-emerald-500/60 flex flex-col gap-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-1/2 text-center">
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-400">
                      Offizielle Lösung ({currentItem.targetProp.label}):
                    </span>
                    <div className="w-full aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center p-3 shadow-sm mt-1">
                      {renderTargetVisual(currentItem.targetProp.content, currentItem.targetProp.type)}
                    </div>
                  </div>

                  <div className="w-full sm:w-1/2 flex flex-col justify-center text-center sm:text-left gap-2">
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                      Vergleiche deine Skizze mit der Lösung
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      War deine gezeichnete Strukturformel korrekt? Bewerte deinen Wissensstand, um das Spaced-Repetition-Lernsystem zu steuern.
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleRateAssessment('correct')}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Richtig (+10)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateAssessment('uncertain')}
                        className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Unsicher</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateAssessment('incorrect')}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Falsch</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
