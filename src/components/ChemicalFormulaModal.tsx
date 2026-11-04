import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FlaskConical,
  Sigma,
  ClipboardPaste,
  Check,
  Eye,
  Info,
} from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import {
  PRESET_COMPOUNDS,
  convertLatexOrTextToSmiles,
  renderSmilesToSvg,
  ChemicalCompoundInfo,
} from '../utils/chemicalStructure';
import { optimizeUploadedImage } from '../utils/storage';

interface ChemicalFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { content: string; type: 'latex' | 'svg' | 'image' | 'text'; details?: string; label?: string }) => void;
  initialContent?: string;
  initialDetails?: string;
  initialLabel?: string;
}

export const ChemicalFormulaModal: React.FC<ChemicalFormulaModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialContent = '',
  initialDetails = '',
  initialLabel = '',
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'latex' | 'clipboard'>('structure');
  const [inputText, setInputText] = useState(initialContent);
  const [inputDetails, setInputDetails] = useState(initialDetails);
  const [inputLabel, setInputLabel] = useState(initialLabel);
  const [previewDark, setPreviewDark] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const pasteAreaRef = useRef<HTMLDivElement | null>(null);

  // Sync initial content on open
  useEffect(() => {
    if (isOpen) {
      setPreviewDark(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
      setInputText(initialContent);
      setInputDetails(initialDetails);
      setInputLabel(initialLabel);
      setPastedImage(initialContent.startsWith('data:image') ? initialContent : null);
      if (initialContent.startsWith('data:image')) {
        setActiveTab('clipboard');
      } else if (initialContent.includes('\\chemfig') || convertLatexOrTextToSmiles(initialContent)) {
        setActiveTab('structure');
      } else {
        setActiveTab('latex');
      }
    }
  }, [isOpen, initialContent, initialDetails, initialLabel]);

  // Update live preview when inputText changes
  useEffect(() => {
    let isCancelled = false;
    const smiles = convertLatexOrTextToSmiles(inputText);

    if (smiles) {
      renderSmilesToSvg(smiles, { isDark: previewDark, width: 280, height: 200 })
        .then((svg) => {
          if (!isCancelled) setRenderedSvg(svg);
        })
        .catch(() => {
          if (!isCancelled) setRenderedSvg(null);
        });
    } else {
      setRenderedSvg(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [inputText, previewDark]);

  if (!isOpen) return null;

  // Handle preset compound selection
  const handleSelectPreset = (compound: ChemicalCompoundInfo) => {
    setInputText(`\\chemfig{${compound.smiles}}`);
    if (!inputLabel) setInputLabel(compound.name.split('(')[0].trim());
    if (!inputDetails) setInputDetails(`${compound.formula} · ${compound.category}`);
  };

  // Handle ring / group insertion
  const handleInsertToken = (token: string) => {
    setInputText((prev) => (prev ? `${prev} ${token}` : token));
  };

  // Handle direct clipboard paste
  const handlePasteEvent = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const dataUrl = await optimizeUploadedImage(file, 380);
            setPastedImage(dataUrl);
            setPasteError(null);
            return;
          } catch (err) {
            setPasteError('Fehler beim Verarbeiten des Screenshots.');
          }
        }
      }
    }
  };

  // Handle file drop on paste zone
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      try {
        const dataUrl = await optimizeUploadedImage(files[0], 380);
        setPastedImage(dataUrl);
        setPasteError(null);
      } catch {
        setPasteError('Fehler beim Laden der Bilddatei.');
      }
    }
  };

  // Button to read from clipboard via modern Navigator API
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
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'screenshot.png', { type });
            const dataUrl = await optimizeUploadedImage(file, 380);
            setPastedImage(dataUrl);
            return;
          }
        }
      }
      setPasteError('Kein Bild in der Zwischenablage gefunden. Kopiere erst einen Screenshot mit Strg+C.');
    } catch {
      setPasteError('Zugriff auf Zwischenablage verweigert oder nicht unterstützt. Nutze Tastatur: Strg+V.');
    }
  };

  const handleApplyResult = () => {
    if (activeTab === 'clipboard' && pastedImage) {
      onApply({
        content: pastedImage,
        type: 'image',
        label: inputLabel,
        details: inputDetails,
      });
      onClose();
      return;
    }

    // Check if we have SVG from SMILES/ChemFig
    if (renderedSvg && activeTab === 'structure') {
      onApply({
        content: renderedSvg,
        type: 'svg',
        label: inputLabel,
        details: inputDetails,
      });
      onClose();
      return;
    }

    // Otherwise apply as LaTeX
    onApply({
      content: inputText,
      type: 'latex',
      label: inputLabel,
      details: inputDetails,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
                Strukturformeln & LaTeX-Assistent
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                2D-Strukturformeln, ChemFig, KaTeX-Summenformeln oder Screenshot einfügen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Schließen"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('structure')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'structure'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>2D-Strukturformel & ChemFig</span>
          </button>

          <button
            onClick={() => setActiveTab('latex')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'latex'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sigma className="w-4 h-4" />
            <span>LaTeX-Summenformeln</span>
          </button>

          <button
            onClick={() => setActiveTab('clipboard')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'clipboard'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Screenshot / Bild einfügen</span>
          </button>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Top Live Preview Card (Always visible with light/dark preview toggle) */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>Live-Vorschau (Hoher Kontrast)</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewDark(!previewDark)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500"
              >
                Vorschau: {previewDark ? 'Dunkler Modus' : 'Heller Modus'}
              </button>
            </div>

            {/* Preview Viewport */}
            <div
              className={`w-full min-h-[160px] sm:min-h-[190px] rounded-xl border-2 flex items-center justify-center p-4 transition-colors ${
                previewDark
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-200 border-slate-300 text-slate-950 shadow-inner'
              }`}
            >
              {activeTab === 'clipboard' && pastedImage ? (
                <img
                  src={pastedImage}
                  alt="Eingefügter Screenshot"
                  className="max-h-[180px] max-w-full object-contain filter drop-shadow-xs"
                />
              ) : renderedSvg ? (
                <div
                  className="w-full h-full max-h-[180px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: renderedSvg }}
                />
              ) : inputText ? (
                <LatexRenderer
                  latex={inputText}
                  displayMode={true}
                  isDark={previewDark}
                  className="text-lg sm:text-xl"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  Keine Formel oder Bild vorhanden. Wähle unten eine Vorlage oder füge Inhalt ein.
                </span>
              )}
            </div>
          </div>

          {/* TAB 1: 2D-STRUKTURFORMEL & CHEMFIG */}
          {activeTab === 'structure' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Strukturformel-Code (LaTeX \chemfig{'{...}'}, SMILES oder Substanzname)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="z.B. \chemfig{*6(-=-=-=)} oder Aspirin oder CC(=O)Oc1ccccc1C(=O)O"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-50 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Unterstützt LaTeX ChemFig, SMILES-Codes und Direkteingabe gängiger Wirkstoffnamen.
                </p>
              </div>

              {/* Chemical Rings & Functional Groups Builder */}
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Chemische Bausteine (1-Klick zum Einfügen):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 self-center mr-1">Ringe:</span>
                  {[
                    { label: 'Benzol', val: '\\chemfig{*6(-=-=-=)}' },
                    { label: 'Cyclohexan', val: '\\chemfig{*6(------)}' },
                    { label: 'Pyridin', val: '\\chemfig{*6(-=-=N-=)}' },
                    { label: 'Purin', val: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setInputText(item.val)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-950 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-800 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}

                  <span className="text-[10px] font-bold text-slate-500 self-center ml-2 mr-1">Gruppen:</span>
                  {[
                    { label: '-COOH', val: '-COOH' },
                    { label: '-OH', val: '-OH' },
                    { label: '-NH2', val: '-NH_2' },
                    { label: '-OAc', val: '-OCOCH_3' },
                    { label: '-NO2', val: '-NO_2' },
                    { label: '-CHO', val: '-CHO' },
                    { label: '-Cl', val: '-Cl' },
                    { label: '-CH3', val: '-CH_3' },
                  ].map((group) => (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => handleInsertToken(group.val)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-950 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-800 font-mono cursor-pointer"
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pharmaceutical Preset Compounds Library */}
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Pharmazeutische & Chemische Standard-Substanzen:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_COMPOUNDS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectPreset(c)}
                      className="p-2 text-left rounded-xl bg-slate-100 dark:bg-slate-950/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-300 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                        {c.name.split('(')[0].trim()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {c.formula} · {c.category.split('/')[0].trim()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LATEX-SUMMENFORMELN */}
          {activeTab === 'latex' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  LaTeX Math-Formel (KaTeX)
                </label>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="z.B. \mathrm{C_9H_8O_4} oder \mathrm{2\,H_2 + O_2 \rightarrow 2\,H_2O}"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-50 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* KaTeX Symbol Chips */}
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Formel-Symbole & Operatoren:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Subskript (_2)', val: '_2' },
                    { label: 'Superskript (^2)', val: '^2' },
                    { label: 'Ladung (+)', val: '^{+}' },
                    { label: 'Ladung (2-)', val: '^{2-}' },
                    { label: 'Pfeil (→)', val: '\\rightarrow ' },
                    { label: 'Gleichgewicht (⇌)', val: '\\rightleftharpoons ' },
                    { label: 'Delta (Δ)', val: '\\Delta ' },
                    { label: 'Grad Celsius (°C)', val: '^\\circ\\mathrm{C}' },
                    { label: '\\mathrm{...}', val: '\\mathrm{}' },
                    { label: 'Bruch (\\frac)', val: '\\frac{A}{B}' },
                  ].map((sym) => (
                    <button
                      key={sym.label}
                      type="button"
                      onClick={() => handleInsertToken(sym.val)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-950 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-800 font-mono cursor-pointer"
                    >
                      {sym.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCREENSHOT / BILD EINFÜGEN */}
          {activeTab === 'clipboard' && (
            <div className="flex flex-col gap-4">
              <div
                ref={pasteAreaRef}
                tabIndex={0}
                onPaste={handlePasteEvent}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="w-full min-h-[170px] rounded-2xl border-2 border-dashed border-emerald-500/70 bg-emerald-50/40 dark:bg-slate-950/80 p-6 flex flex-col items-center justify-center text-center cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs">
                  <ClipboardPaste className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Kopierten Screenshot oder Bild hier einfügen
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                  Kopiere ein Bild aus <strong>ChemDraw, MarvinSketch, Wikipedia</strong> oder erstelle einen
                  Screenshot und drücke <strong>Strg + V (bzw. ⌘ + V)</strong>.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReadClipboard}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Aus Zwischenablage einfügen</span>
                  </button>
                </div>
              </div>

              {pasteError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{pasteError}</span>
                </div>
              )}
            </div>
          )}

          {/* Optional Label & Details inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-300 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                Karten-Beschriftung (Label)
              </label>
              <input
                type="text"
                value={inputLabel}
                onChange={(e) => setInputLabel(e.target.value)}
                placeholder="z.B. Acetylsalicylsäure"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                Zusätzliche Details / Indikation
              </label>
              <input
                type="text"
                value={inputDetails}
                onChange={(e) => setInputDetails(e.target.value)}
                placeholder="z.B. C9H8O4 · NSAR / Analgetikum"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleApplyResult}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>In Karte übernehmen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
