/**
 * Version information extracted directly from tauri.conf.json
 */
import tauriConfig from '../../src-tauri/tauri.conf.json';

export const APP_VERSION: string = tauriConfig.version || '1.0.0';
export const APP_PRODUCT_NAME: string = tauriConfig.productName || 'PandaMatch';
export const APP_IDENTIFIER: string = tauriConfig.identifier || 'com.pandamatch.app';
