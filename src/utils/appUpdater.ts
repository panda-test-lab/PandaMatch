import { invoke, isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';

export interface AvailableAppUpdate {
  version: string;
  body?: string;
}

export async function checkForAppUpdate(): Promise<AvailableAppUpdate | null> {
  if (!isTauri() || import.meta.env.DEV) return null;

  const isDesktop = await invoke<boolean>('is_desktop_app');
  if (!isDesktop) return null;

  const update = await check();
  if (!update) return null;

  const result = { version: update.version, body: update.body?.trim() || undefined };
  await update.close();
  return result;
}

export async function downloadAndInstallAppUpdate(): Promise<boolean> {
  if (!isTauri() || import.meta.env.DEV) return false;
  const update = await check();
  if (!update) return false;
  try {
    const releaseNotes = update.body?.trim();
    const notes = releaseNotes ? `\n\nÄnderungen:\n${releaseNotes}` : '';
    const accepted = window.confirm(
      `PandaMatch ${update.version} wird jetzt heruntergeladen und installiert.${notes}\n\nDie App wird anschließend neu gestartet.`
    );
    if (!accepted) return false;
    await update.downloadAndInstall();
    await invoke('restart_app');
    return true;
  } finally {
    await update.close();
  }
}
