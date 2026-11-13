import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CloudDownload, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { CardSet } from '../types/memory';
import { importCardSetsJson } from '../utils/storage';
import { readSetArchive } from '../utils/setArchives';
import {
  downloadRepositorySetArchive,
  listRepositorySetArchives,
  RepositorySetArchive,
} from '../utils/setRepository';
import { reportAppError } from '../utils/errorReporting';

interface RepoSetImportModalProps {
  allSets: CardSet[];
  onClose: () => void;
  onImportSuccess: (sets: CardSet[]) => void;
}

function archiveFilename(path: string): string {
  return path.split('/').pop() || path;
}

function normalizedName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function findInstalledSet(archive: RepositorySetArchive, sets: CardSet[]): CardSet | undefined {
  const filename = archiveFilename(archive.path);
  const title = filename.replace(/\.zip$/i, '');
  return sets.find((set) => set.sourceRepoPath === archive.path) ??
    sets.find((set) => set.sourceArchiveSha === archive.sha) ??
    sets.find((set) => set.sourceArchiveName && normalizedName(archiveFilename(set.sourceArchiveName)) === normalizedName(filename)) ??
    sets.find((set) => normalizedName(set.title) === normalizedName(title));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RepoSetImportModal({
  allSets,
  onClose,
  onImportSuccess,
}: RepoSetImportModalProps) {
  const [archives, setArchives] = useState<RepositorySetArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listRepositorySetArchives()
      .then((result) => {
        if (!cancelled) setArchives(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const message = String(cause);
        setError(message);
        reportAppError(cause, 'Sets aus PandaMatch_Sets laden');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async (archive: RepositorySetArchive) => {
    const installed = findInstalledSet(archive, allSets);
    if (installed && installed.sourceArchiveSha !== archive.sha) {
      const confirmed = window.confirm(
        `„${installed.title}“ wird durch die Repo-Version ersetzt. Lokale Änderungen an diesem Set gehen dabei verloren. Fortfahren?`
      );
      if (!confirmed) return;
    }

    setDownloadingPath(archive.path);
    setError(null);
    try {
      const bytes = await downloadRepositorySetArchive(archive);
      const set = await readSetArchive(bytes, {
        archiveName: archiveFilename(archive.path),
        sourceArchiveSha: archive.sha,
        sourceRepoPath: archive.path,
      });
      const result = importCardSetsJson(JSON.stringify(set));
      if (!result.success) throw new Error(result.message);
      onImportSuccess(result.importedSets);
    } catch (cause) {
      setError(String(cause));
      reportAppError(cause, `ZIP-Set ${archive.path} importieren`);
    } finally {
      setDownloadingPath(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-set-import-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <section
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-300 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <CloudDownload className="h-5 w-5 text-sky-500" />
            <div>
              <h2 id="repo-set-import-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                Sets aus PandaMatch_Sets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ZIP-Dateien aus dem GitHub-Repository
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-5">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Set-Liste wird geladen …
            </div>
          )}

          {!isLoading && archives.length === 0 && !error && (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Im Repository sind derzeit keine ZIP-Sets vorhanden.
            </p>
          )}

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ul className="space-y-2">
            {archives.map((archive) => {
              const installed = findInstalledSet(archive, allSets);
              const isCurrent = installed?.sourceArchiveSha === archive.sha;
              const isDownloading = downloadingPath === archive.path;
              const name = archiveFilename(archive.path).replace(/\.zip$/i, '');
              const status = isCurrent
                ? 'Aktuell'
                : installed?.sourceArchiveSha
                  ? 'Update verfügbar'
                  : installed
                    ? 'Vorhanden · Version unbekannt'
                    : 'Noch nicht heruntergeladen';

              return (
                <li
                  key={archive.path}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                    <p className="mt-0.5 break-all text-[11px] text-slate-500 dark:text-slate-400">
                      {archive.path} · {formatSize(archive.size)}
                    </p>
                    <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                      isCurrent
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : installed
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {isCurrent && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {status}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCurrent || downloadingPath !== null}
                    onClick={() => void handleDownload(archive)}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isDownloading
                      ? <LoaderCircle className="h-4 w-4 animate-spin" />
                      : installed
                        ? <RefreshCw className="h-4 w-4" />
                        : <CloudDownload className="h-4 w-4" />}
                    {isCurrent ? 'Aktuell' : installed ? 'Aktualisieren' : 'Herunterladen'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
