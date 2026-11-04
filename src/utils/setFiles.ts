import { invoke, isTauri } from '@tauri-apps/api/core';
import { CardSet } from '../types/memory';

export interface SetsStorageStatus {
  ready: boolean;
  installPath: string;
  suggestedPath: string;
  activePath: string | null;
}

export const isTauriApp = () => isTauri();

export const isMobileApp = () =>
  isTauri() &&
  (/android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const initializeSetsStorage = () =>
  invoke<SetsStorageStatus>('initialize_sets_storage');

export const acceptSuggestedSetsStorage = () =>
  invoke<string>('accept_suggested_sets_storage');

export const chooseSetsStorage = () =>
  invoke<string | null>('choose_sets_storage');

export const loadSavedSets = () =>
  invoke<CardSet[]>('load_saved_sets');

export const writeSavedSet = (set: CardSet) =>
  invoke<string>('write_saved_set', { set });

export const deleteSavedSet = (id: string) =>
  invoke<void>('delete_saved_set', { id });

export const importSetsFromFiles = () =>
  invoke<CardSet[] | null>('import_sets_from_files');

export const exportSetToFile = (set: CardSet) =>
  invoke<string | null>('export_set_to_file', { set });
