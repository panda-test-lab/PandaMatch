import { invoke, isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';

export async function checkForAppUpdate(): Promise<void> {
  if (!isTauri() || import.meta.env.DEV) return;

  const isDesktop = await invoke<boolean>('is_desktop_app');
  if (!isDesktop) return;

  const update = await check();
  if (!update) return;

  try {
    const releaseNotes = update.body?.trim();
    const notes = releaseNotes ? `\n\nÄnderungen:\n${releaseNotes}` : '';
    const accepted = window.confirm(
      `PandaMatch ${update.version} ist verfügbar.${notes}\n\nJetzt herunterladen und installieren? Die App wird anschließend neu gestartet.`
    );
    if (!accepted) return;

    await update.downloadAndInstall();
    await invoke('restart_app');
  } finally {
    await update.close();
  }
}
