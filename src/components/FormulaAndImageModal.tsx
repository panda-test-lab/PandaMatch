import React, { useEffect, useRef, useState } from 'react';
import { Check, ClipboardPaste, Eye, Info, Sigma, X } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import { optimizeUploadedImage } from '../utils/storage';
import { reportAppError } from '../utils/errorReporting';

interface FormulaAndImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    content: string;
    type: 'latex' | 'image';
    details?: string;
    label?: string;
  }) => void;
  initialContent?: string;
  initialDetails?: string;
  initialLabel?: string;
}

export const FormulaAndImageModal: React.FC<FormulaAndImageModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialContent = '',
  initialDetails = '',
  initialLabel = '',
}) => {
  const [activeTab, setActiveTab] = useState<'math' | 'image'>('math');
  const [inputText, setInputText] = useState(initialContent);
  const [inputDetails, setInputDetails] = useState(initialDetails);
  const [inputLabel, setInputLabel] = useState(initialLabel);
  const [previewDark, setPreviewDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const formulaInputRef = useRef<HTMLTextAreaElement | null>(null);
  const formulaSelectionRef = useRef({ start: initialContent.length, end: initialContent.length });

  const replaceFormulaText = (value: string) => {
    formulaSelectionRef.current = { start: value.length, end: value.length };
    setInputText(value);
  };

  useEffect(() => {
    if (!isOpen) return;
    setPreviewDark(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const hasInitialImage = initialContent.startsWith('data:image');
    replaceFormulaText(hasInitialImage ? '' : initialContent);
    setInputDetails(initialDetails);
    setInputLabel(initialLabel);
    setPastedImage(hasInitialImage ? initialContent : null);
    setPasteError(null);
    setActiveTab(hasInitialImage ? 'image' : 'math');
  }, [isOpen, initialContent, initialDetails, initialLabel]);

  if (!isOpen) return null;

  const handleInsertToken = (token: string, cursorOffset = token.length) => {
    const start = Math.min(formulaSelectionRef.current.start, inputText.length);
    const end = Math.min(formulaSelectionRef.current.end, inputText.length);
    const nextText = `${inputText.slice(0, start)}${token}${inputText.slice(end)}`;
    const nextCursor = start + cursorOffset;
    formulaSelectionRef.current = { start: nextCursor, end: nextCursor };
    setInputText(nextText);
    window.requestAnimationFrame(() => {
      formulaInputRef.current?.focus();
      formulaInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleFormulaInputSelection = (input: HTMLTextAreaElement) => {
    formulaSelectionRef.current = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    };
  };

  const handlePasteEvent = async (event: React.ClipboardEvent) => {
    for (const item of Array.from(event.clipboardData?.items || [])) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      try {
        setPastedImage(await optimizeUploadedImage(file, 380));
        setPasteError(null);
        return;
      } catch (error) {
        reportAppError(error, 'Zwischenablagebild verarbeiten');
        setPasteError('Fehler beim Verarbeiten des Bildes.');
        return;
      }
    }
  };

  const handleFileDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((candidate) =>
      candidate.type.startsWith('image/')
    );
    if (!file) return;
    try {
      setPastedImage(await optimizeUploadedImage(file, 380));
      setPasteError(null);
    } catch (error) {
      reportAppError(error, 'Bilddatei laden');
      setPasteError('Fehler beim Laden der Bilddatei.');
    }
  };

  const handleReadClipboard = async () => {
    try {
      setPasteError(null);
      if (!navigator.clipboard?.read) {
        setPasteError('Klicke in das Feld unten und drücke Strg+V (Cmd+V).');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (!type.startsWith('image/')) continue;
          const blob = await item.getType(type);
          const file = new File([blob], 'screenshot.png', { type });
          setPastedImage(await optimizeUploadedImage(file, 380));
          return;
        }
      }
      setPasteError('Kein Bild in der Zwischenablage gefunden. Kopiere erst einen Screenshot mit Strg+C.');
    } catch {
      setPasteError('Zugriff auf Zwischenablage verweigert oder nicht unterstützt. Nutze Strg+V.');
    }
  };

  const handleApplyResult = () => {
    if (activeTab === 'image' && pastedImage) {
      onApply({
        content: pastedImage,
        type: 'image',
        label: inputLabel,
        details: inputDetails,
      });
    } else {
      onApply({
        content: inputText,
        type: 'latex',
        label: inputLabel,
        details: inputDetails,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm animate-fade-in sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-300 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sigma className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white sm:text-lg">
                Mathe- und Grafik-Assistent
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Formeln mit KaTeX schreiben oder Grafiken einfügen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-50 px-5 pt-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'math'
                ? 'border-emerald-500 font-extrabold text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sigma className="h-4 w-4" />
            Mathe-Funktion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'image'
                ? 'border-emerald-500 font-extrabold text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            Grafik einfügen
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <section className="flex flex-col gap-2 rounded-2xl border border-slate-300 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-500" />
                Live-Vorschau
              </span>
              <button
                type="button"
                onClick={() => setPreviewDark((dark) => !dark)}
                className="rounded-lg border border-slate-300 bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-xs hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                Vorschau: {previewDark ? 'Dunkler Modus' : 'Heller Modus'}
              </button>
            </div>
            <div className={`flex min-h-[160px] w-full items-center justify-center overflow-auto rounded-xl border-2 p-4 transition-colors sm:min-h-[190px] ${
              previewDark
                ? 'border-slate-800 bg-slate-950 text-white'
                : 'border-slate-300 bg-slate-200 text-slate-950 shadow-inner'
            }`}>
              {activeTab === 'image' && pastedImage ? (
                <img
                  src={pastedImage}
                  alt="Eingefügte Grafik"
                  className="max-h-[180px] max-w-full object-contain"
                />
              ) : inputText ? (
                <LatexRenderer latex={inputText} displayMode className="text-lg sm:text-xl" />
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  Schreibe eine Formel oder füge eine Grafik ein.
                </span>
              )}
            </div>
          </section>

          {activeTab === 'math' ? (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="formula-editor-input" className="mb-1 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Mathematische Formel (LaTeX)
                </label>
                <textarea
                  id="formula-editor-input"
                  ref={formulaInputRef}
                  rows={3}
                  value={inputText}
                  onChange={(event) => {
                    formulaSelectionRef.current = {
                      start: event.target.selectionStart,
                      end: event.target.selectionEnd,
                    };
                    setInputText(event.target.value);
                  }}
                  onSelect={(event) => handleFormulaInputSelection(event.currentTarget)}
                  onClick={(event) => handleFormulaInputSelection(event.currentTarget)}
                  onKeyUp={(event) => handleFormulaInputSelection(event.currentTarget)}
                  placeholder="z. B. \mathrm{H_2O} oder \frac{a}{b}"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-slate-200 px-3.5 py-2 font-mono text-xs font-bold text-slate-950 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-400 sm:text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Gib LaTeX ein und prüfe das Ergebnis in der Live-Vorschau.
                </p>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Formel-Symbole & Operatoren:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Subskript (_2)', value: '_2' },
                    { label: 'Superskript (^2)', value: '^2' },
                    { label: 'Ladung (+)', value: '^{+}' },
                    { label: 'Ladung (2-)', value: '^{2-}' },
                    { label: 'Pfeil (→)', value: '\\rightarrow ' },
                    { label: 'Gleichgewicht (⇌)', value: '\\rightleftharpoons ' },
                    { label: 'Delta (Δ)', value: '\\Delta ' },
                    { label: 'Grad Celsius (°C)', value: '^\\circ\\mathrm{C}' },
                    { label: '\\mathrm{...}', value: '\\mathrm{}' },
                    { label: 'Bruch (\\frac)', value: '\\frac{a}{b}' },
                  ].map((symbol) => (
                    <button
                      key={symbol.label}
                      type="button"
                      onClick={() => handleInsertToken(
                        symbol.value,
                        symbol.value === '\\mathrm{}' ? symbol.value.length - 1 : symbol.value.length,
                      )}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-slate-200 px-2 py-1 font-mono text-xs font-bold text-slate-950 hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {symbol.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div
                tabIndex={0}
                onPaste={(event) => void handlePasteEvent(event)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void handleFileDrop(event)}
                className="flex min-h-[170px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/70 bg-emerald-50/40 p-6 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950/80"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300 bg-emerald-100 text-emerald-600 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-400">
                  <ClipboardPaste className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">
                  Grafik hier einfügen
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-600 dark:text-slate-300">
                  Füge ein kopiertes Bild mit <strong>Strg + V (bzw. ⌘ + V)</strong> ein oder ziehe eine Bilddatei hierher.
                </p>
                <button
                  type="button"
                  onClick={() => void handleReadClipboard()}
                  className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Aus Zwischenablage einfügen
                </button>
              </div>
              {pasteError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-200">
                  <Info className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{pasteError}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 border-t border-slate-300 pt-2 dark:border-slate-800 sm:grid-cols-2">
            <div>
              <label htmlFor="formula-card-label" className="mb-1 block text-xs font-bold text-slate-900 dark:text-slate-300">
                Karten-Beschriftung (Label)
              </label>
              <input
                id="formula-card-label"
                type="text"
                value={inputLabel}
                onChange={(event) => setInputLabel(event.target.value)}
                placeholder="z. B. Wasser"
                className="w-full rounded-xl border border-slate-300 bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-950 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
            <div>
              <label htmlFor="formula-card-details" className="mb-1 block text-xs font-bold text-slate-900 dark:text-slate-300">
                Zusätzliche Details
              </label>
              <input
                id="formula-card-details"
                type="text"
                value={inputDetails}
                onChange={(event) => setInputDetails(event.target.value)}
                placeholder="Optionale Zusatzinformation"
                className="w-full rounded-xl border border-slate-300 bg-slate-200 px-3 py-1.5 font-mono text-xs font-bold text-slate-950 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-300 bg-slate-100 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleApplyResult}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            In Karte übernehmen
          </button>
        </footer>
      </div>
    </div>
  );
};
