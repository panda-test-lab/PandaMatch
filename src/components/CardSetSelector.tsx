import React, { useState, useRef } from 'react';
import { CardSet } from '../types/memory';
import {
  importCardSetsJson
} from '../utils/storage';
import { readSetArchive, writeSetArchive } from '../utils/setArchives';
import {
  exportSetToFile,
  importSetsFromFiles,
  isTauriApp,
} from '../utils/setFiles';
import { RepoSetImportModal } from './RepoSetImportModal';
import {
  Search,
  Plus,
  Play,
  Trash2,
  Edit3,
  Download,
  Upload,
  Sparkles,
  FileJson,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { canUseDrawingMode } from '../utils/drawingMode';
import { reportAppError } from '../utils/errorReporting';

interface CardSetSelectorProps {
  allSets: CardSet[];
  setsDirectory?: string | null;
  onSelectSet: (set: CardSet) => void;
  onSelectRecall?: (set: CardSet) => void;
  onSelectDrawing?: (set: CardSet) => void;
  onCreateNewSet: () => void;
  onEditSet: (set: CardSet) => void;
  onDeleteSet: (setId: string) => void;
  onImportSuccess?: (imported: CardSet[]) => void;
}

export const CardSetSelector: React.FC<CardSetSelectorProps> = ({
  allSets,
  setsDirectory,
  onSelectSet,
  onSelectRecall,
  onSelectDrawing,
  onCreateNewSet,
  onEditSet,
  onDeleteSet,
  onImportSuccess,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [repoImportOpen, setRepoImportOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredSets = allSets.filter((set) => {
    if (filterTab === 'custom' && !set.isCustom) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = set.title.toLowerCase().includes(q);
      const matchDesc = set.description.toLowerCase().includes(q);
      const matchCat = set.category.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCat;
    }
    return true;
  });

  const handleExportSingleSet = async (set: CardSet) => {
    if (isTauriApp()) {
      try {
        const path = await exportSetToFile(set);
        if (path) {
          showNotice('success', `Kartenset wurde als ZIP-Datei exportiert: ${path}`);
        }
      } catch (error) {
        reportAppError(error, 'Kartenset exportieren');
        showNotice('error', `Kartenset konnte nicht exportiert werden: ${String(error)}`);
      }
      return;
    }

    try {
      const archive = writeSetArchive(set);
      const filename = set.title
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/[. ]+$/g, '')
        .trim() || 'Kartenset';
      downloadArchiveFile(archive, `${filename}.zip`);
      showNotice('success', `Kartenset „${set.title}“ als ZIP exportiert!`);
    } catch (error) {
      reportAppError(error, 'Kartenset exportieren');
      showNotice('error', `Kartenset konnte nicht exportiert werden: ${String(error)}`);
    }
  };

  const handleNativeImport = async () => {
    try {
      const importedSets = await importSetsFromFiles();
      if (!importedSets || importedSets.length === 0) return;
      processJsonImport(JSON.stringify(importedSets));
    } catch (error) {
      reportAppError(error, 'Kartenset-Datei importieren');
      showNotice('error', `Kartenset-Datei konnte nicht importiert werden: ${String(error)}`);
    }
  };

  const downloadArchiveFile = (bytes: Uint8Array, filename: string) => {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = '';
    if (file.name.toLowerCase().endsWith('.zip')) {
      void file.arrayBuffer()
        .then((buffer) => readSetArchive(new Uint8Array(buffer), { archiveName: file.name }))
        .then((set) => processJsonImport(JSON.stringify(set)))
        .catch((error: unknown) => {
          reportAppError(error, 'Kartenset-ZIP importieren');
          showNotice('error', `ZIP-Datei konnte nicht importiert werden: ${String(error)}`);
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        processJsonImport(text);
      }
    };
    reader.readAsText(file);
  };

  const processJsonImport = (jsonText: string) => {
    const result = importCardSetsJson(jsonText);
    if (result.success) {
      showNotice('success', result.message);
      setImportModalOpen(false);
      setPastedJson('');
      if (onImportSuccess) {
        onImportSuccess(result.importedSets);
      }
    } else {
      showNotice('error', result.message);
    }
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 select-none">
      {/* Hidden File Input for JSON and ZIP imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,.zip,application/zip"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>🎴</span>
            <span>Kartensets & Kategorien</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Verwalte, erstelle, bearbeite, lösche, importiere und exportiere deine Kartensets mitsamt allen Eigenschaften.
          </p>
          {setsDirectory && (
            <p className="mt-1 break-all text-[11px] text-slate-500 dark:text-slate-400">
              Dateispeicher: <span className="font-mono">{setsDirectory}</span>
            </p>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* JSON Import Button */}
          <button
            onClick={() => {
              if (isTauriApp()) void handleNativeImport();
              else fileInputRef.current?.click();
            }}
            title="Einzelne Kartenset-Datei(en) mit zugehörigen Bildern importieren"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>Set(s) importieren</span>
          </button>

          <button
            onClick={() => setRepoImportOpen(true)}
            title="ZIP-Kartensets aus dem PandaMatch_Sets-Repository anzeigen und herunterladen"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-300 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-900 dark:text-sky-100 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <CloudDownload className="w-4 h-4 text-sky-500" />
            <span>Sets aus Repo</span>
          </button>

          {/* Direct JSON Paste Button */}
          <button
            onClick={() => setImportModalOpen(true)}
            title="JSON-Code direkt einfügen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <FileCodeIcon className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">JSON Einfügen</span>
          </button>

          {/* Create New Set */}
          <button
            onClick={onCreateNewSet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Neues Set erstellen</span>
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusNotification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-fade-in ${
            statusNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusNotification.message}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {repoImportOpen && (
        <RepoSetImportModal
          allSets={allSets}
          onClose={() => setRepoImportOpen(false)}
          onImportSuccess={(sets) => {
            onImportSuccess?.(sets);
            showNotice('success', `${sets.length} Set(s) aus PandaMatch_Sets importiert.`);
          }}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Alle ({allSets.length})
          </button>
          <button
            onClick={() => setFilterTab('custom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterTab === 'custom'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Eigene / Editierte ({allSets.filter((s) => s.isCustom).length})
          </button>
        </div>

        {/* Search Field */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kartenset suchen..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Card Sets: ALL SETS ARE EDITABLE AND DELETABLE */}
      {filteredSets.length === 0 ? (
        <div className="w-full py-16 px-6 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Keine Sets gefunden</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {allSets.length === 0
              ? 'Noch keine Kartensets vorhanden. Erstelle ein neues Set oder importiere vorhandene Sets.'
              : filterTab === 'custom'
              ? 'Du hast noch keine eigenen oder bearbeiteten Kartensets. Erstelle ein neues Set oder bearbeite ein bestehendes!'
              : 'Kein Kartenset entspricht deinen aktuellen Suchkriterien.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={onCreateNewSet}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              Jetzt neues Set erstellen
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSets.map((set) => {
            const propertiesCount = set.availableProperties?.length || 2;

            return (
              <div
                key={set.id}
                className="@container flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 p-3 transition-all shadow-xs hover:border-slate-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 sm:p-5"
              >
                <div>
                  {/* Top Bar with Icon, Title, and Badges */}
                  <div className="mb-2 flex min-w-0 flex-col gap-2 @sm:flex-row @sm:items-start @sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2 @sm:gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl select-none shadow-xs dark:border-slate-800 dark:bg-slate-950 @sm:h-12 @sm:w-12 @sm:text-2xl">
                        {set.icon || '🎴'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base leading-snug font-extrabold text-slate-900 dark:text-white">
                          {set.title}
                        </h3>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="break-words">{set.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums font-bold">{set.pairs.length} Paare</span>
                          <span aria-hidden="true">·</span>
                          <span className="break-words font-semibold text-emerald-600 dark:text-emerald-400">
                            {propertiesCount} Eigenschaften
                          </span>
                        </div>
                      </div>
                    </div>

                    {set.isCustom && (
                      <span className="max-w-full shrink-0 self-start rounded-md border border-emerald-300 bg-emerald-100/60 px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Individuell
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 my-2.5">
                    {set.description || 'Kartenset mit flexiblen Eigenschaften.'}
                  </p>

                  {/* Properties Tags Ribbon */}
                  {set.availableProperties && set.availableProperties.length > 0 && (
                    <div className="mb-2.5 flex flex-wrap items-center gap-1">
                      {set.availableProperties.map((p) => (
                        <span
                          key={p.key}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Previews Ribbon */}
                  <div className="my-2 flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-100 p-2 dark:border-slate-800 dark:bg-slate-950">
                    {set.pairs.slice(0, 5).map((p, idx) => (
                      <div
                        key={idx}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-xs text-center overflow-hidden"
                      >
                        {p.cardA.type === 'svg' ? (
                          <div
                            className="w-8 h-8 flex items-center justify-center p-0.5 text-slate-950 dark:text-white"
                            dangerouslySetInnerHTML={{ __html: p.cardA.content }}
                          />
                        ) : p.cardA.type === 'image' ? (
                          <img
                            src={p.cardA.content}
                            alt={p.title}
                            className="w-7 h-7 object-contain rounded"
                          />
                        ) : p.cardA.type === 'text' ? (
                          <span className="text-[10px] font-extrabold text-slate-900 dark:text-white truncate px-1">
                            {p.cardA.content}
                          </span>
                        ) : (
                          <span className="text-lg select-none">{p.cardA.content}</span>
                        )}
                      </div>
                    ))}
                    {set.pairs.length > 5 && (
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 font-mono">
                        +{set.pairs.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Play + Recall + Draw + ALL Sets can be Exported, Edited, Deleted! */}
                <div className="mt-2 flex min-w-0 flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 @sm:flex-row @sm:items-center @sm:justify-between">
                  <div className="flex min-w-0 items-center gap-1.5 @sm:flex-1">
                    <button
                      onClick={() => onSelectSet(set)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl bg-slate-200 px-2.5 py-2 text-xs font-bold whitespace-nowrap text-slate-900 transition-colors hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:text-slate-100"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Spielen</span>
                    </button>
                    {onSelectRecall && (
                      <button
                        onClick={() => onSelectRecall(set)}
                        title="Selbstabfrage starten"
                        className="shrink-0 cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 @sm:flex @sm:items-center @sm:justify-center @sm:gap-1"
                      >
                        <span>🧠</span>
                        <span className="hidden @sm:inline">Test</span>
                      </button>
                    )}
                    {onSelectDrawing && canUseDrawingMode(set) && (
                      <button
                        onClick={() => onSelectDrawing(set)}
                        title="Zeichenmodus starten"
                        className="shrink-0 cursor-pointer rounded-xl border border-teal-300 bg-teal-50 px-2 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900 @sm:flex @sm:items-center @sm:justify-center @sm:gap-1"
                      >
                        <span>✏️</span>
                        <span className="hidden @sm:inline">Skizze</span>
                      </button>
                    )}
                  </div>

                  {/* SET MANAGEMENT BUTTONS: EXPORT, EDIT, DELETE (For ALL sets!) */}
                  <div className="flex shrink-0 items-center gap-1 self-end @sm:self-auto">
                    {/* Export ZIP */}
                    <button
                      onClick={() => handleExportSingleSet(set)}
                      title="Dieses Set mit Bildern als gepackte ZIP-Datei exportieren"
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Set */}
                    <button
                      onClick={() => onEditSet(set)}
                      title="Kartenset & Eigenschaften im Editor bearbeiten"
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Set */}
                    <button
                      onClick={() => {
                        if (confirm(`Möchtest du das Kartenset „${set.title}“ wirklich löschen?`)) {
                          onDeleteSet(set.id);
                          showNotice('success', `Kartenset „${set.title}“ wurde gelöscht.`);
                        }
                      }}
                      title="Kartenset löschen"
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Direct Paste JSON Import */}
      {importModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Kartenset(s) als JSON oder ZIP importieren
                </h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Füge hier den JSON-Code ein oder wähle eine JSON- bzw. ZIP-Datei mit Set-Ordner und Bildern aus. Alle definierten Eigenschaften und Medien werden übernommen.
            </p>

            <textarea
              rows={9}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{\n  "title": "Mein Set",\n  "category": "Chemie",\n  "pairs": [...]\n}'
              className="mt-3 w-full p-3 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Oder Datei auswählen</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setPastedJson('');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  disabled={!pastedJson.trim()}
                  onClick={() => processJsonImport(pastedJson)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                    pastedJson.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  Importieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple icon component for JSON Code button
const FileCodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 17 2-2-2-2" />
  </svg>
);
