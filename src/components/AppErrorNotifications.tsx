import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import {
  AppErrorNotice,
  dismissAppError,
  subscribeToAppErrors,
} from '../utils/errorReporting';

export function AppErrorNotifications() {
  const [notice, setNotice] = useState<AppErrorNotice | null>(null);

  useEffect(() => subscribeToAppErrors(setNotice), []);

  if (!notice) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-[100] w-[min(92vw,30rem)] rounded-2xl border border-rose-400 bg-rose-50 p-4 text-rose-950 shadow-2xl dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">In der App ist ein Fehler aufgetreten</p>
          <p className="mt-1 break-words text-sm">{notice.context}: {notice.message}</p>
          {notice.logPath && (
            <p className="mt-2 break-all text-xs">
              Fehlerprotokoll: <span className="font-mono">{notice.logPath}</span>
            </p>
          )}
          {notice.loggingError && (
            <p className="mt-2 text-xs">
              Das Fehlerprotokoll konnte nicht gespeichert werden: {notice.loggingError}
            </p>
          )}
          {!notice.logPath && !notice.loggingError && (
            <p className="mt-2 text-xs">
              {isTauri()
                ? 'Fehlerprotokoll wird gespeichert …'
                : 'Im Browser ist kein App-Ordner verfügbar; Details stehen in der Browserkonsole.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismissAppError}
          aria-label="Fehlermeldung schließen"
          className="rounded-lg p-1 text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
