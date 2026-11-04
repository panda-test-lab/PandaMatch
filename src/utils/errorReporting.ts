import { invoke, isTauri } from '@tauri-apps/api/core';

export interface AppErrorNotice {
  id: number;
  context: string;
  message: string;
  logPath: string | null;
  loggingError: string | null;
}

type ErrorListener = (notice: AppErrorNotice | null) => void;

const listeners = new Set<ErrorListener>();
let currentNotice: AppErrorNotice | null = null;
let nextNoticeId = 0;

function publish(notice: AppErrorNotice | null) {
  currentNotice = notice;
  listeners.forEach((listener) => listener(notice));
}

function errorDetails(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack || null };
  }
  return { message: String(error), stack: null };
}

export function reportAppError(error: unknown, context: string): void {
  const { message, stack } = errorDetails(error);
  const notice: AppErrorNotice = {
    id: ++nextNoticeId,
    context,
    message,
    logPath: null,
    loggingError: null,
  };

  console.error(`[PandaMatch] ${context}:`, error);
  publish(notice);

  if (!isTauri()) return;

  void invoke<string>('report_error', { context, message, stack }).then(
    (logPath) => {
      if (currentNotice?.id === notice.id) {
        publish({ ...notice, logPath });
      }
    },
    (loggingError: unknown) => {
      console.error('[PandaMatch] Fehler konnte nicht in error.log gespeichert werden:', loggingError);
      if (currentNotice?.id === notice.id) {
        publish({ ...notice, loggingError: String(loggingError) });
      }
    },
  );
}

export function subscribeToAppErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  listener(currentNotice);
  return () => listeners.delete(listener);
}

export function dismissAppError(): void {
  publish(null);
}

export function installGlobalErrorHandlers(): () => void {
  const onError = (event: ErrorEvent) => {
    reportAppError(event.error ?? event.message, 'Unerwarteter Laufzeitfehler');
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportAppError(event.reason, 'Nicht behandelter asynchroner Fehler');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
