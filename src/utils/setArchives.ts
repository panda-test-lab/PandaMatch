import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { CardSet } from '../types/memory';

const MAX_SET_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_SET_ARCHIVE_FILES = 512;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_FILE_HEADER = 0x02014b50;

function validateArchiveLimits(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEndRecordSize = 22;
  const searchStart = Math.max(0, bytes.byteLength - minimumEndRecordSize - 0xffff);
  let endRecordOffset = -1;

  for (let offset = bytes.byteLength - minimumEndRecordSize; offset >= searchStart; offset -= 1) {
    if (
      view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY &&
      offset + minimumEndRecordSize + view.getUint16(offset + 20, true) === bytes.byteLength
    ) {
      endRecordOffset = offset;
      break;
    }
  }
  if (endRecordOffset < 0) {
    throw new Error('Ungültige ZIP-Datei: ZIP-Verzeichnis fehlt.');
  }

  const diskNumber = view.getUint16(endRecordOffset + 4, true);
  const directoryDiskNumber = view.getUint16(endRecordOffset + 6, true);
  const entriesOnDisk = view.getUint16(endRecordOffset + 8, true);
  const entryCount = view.getUint16(endRecordOffset + 10, true);
  const directorySize = view.getUint32(endRecordOffset + 12, true);
  const directoryOffset = view.getUint32(endRecordOffset + 16, true);

  if (
    diskNumber !== 0 ||
    directoryDiskNumber !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    throw new Error('Mehrteilige oder ZIP64-Archive werden nicht unterstützt.');
  }
  if (entryCount > MAX_SET_ARCHIVE_FILES) {
    throw new Error(`Die ZIP-Datei enthält mehr als ${MAX_SET_ARCHIVE_FILES} Einträge.`);
  }

  const directoryEnd = directoryOffset + directorySize;
  if (directoryEnd > endRecordOffset || directoryEnd < directoryOffset) {
    throw new Error('Ungültige ZIP-Datei: ZIP-Verzeichnis ist beschädigt.');
  }

  let expandedBytes = 0;
  let entryOffset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      entryOffset + 46 > directoryEnd ||
      view.getUint32(entryOffset, true) !== ZIP_CENTRAL_DIRECTORY_FILE_HEADER
    ) {
      throw new Error('Ungültige ZIP-Datei: ZIP-Verzeichnis ist beschädigt.');
    }

    const compressedSize = view.getUint32(entryOffset + 20, true);
    const uncompressedSize = view.getUint32(entryOffset + 24, true);
    const filenameLength = view.getUint16(entryOffset + 28, true);
    const extraLength = view.getUint16(entryOffset + 30, true);
    const commentLength = view.getUint16(entryOffset + 32, true);
    const localHeaderOffset = view.getUint32(entryOffset + 42, true);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new Error('Mehrteilige oder ZIP64-Archive werden nicht unterstützt.');
    }
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_SET_ARCHIVE_BYTES) {
      throw new Error('Der entpackte Inhalt der ZIP-Datei ist größer als 100 MB.');
    }

    entryOffset += 46 + filenameLength + extraLength + commentLength;
    if (entryOffset > directoryEnd) {
      throw new Error('Ungültige ZIP-Datei: ZIP-Verzeichnis ist beschädigt.');
    }
  }
}

export interface SetArchiveMetadata {
  archiveName?: string;
  sourceArchiveSha?: string;
  sourceRepoPath?: string;
}

function normalizeArchivePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  if (
    normalized.startsWith('/') ||
    /^[a-z]:/i.test(normalized) ||
    normalized.split('/').some((part) => part === '.' || part === '..')
  ) {
    throw new Error(`Unsicherer Pfad in der ZIP-Datei: ${path}`);
  }
  return normalized.split('/').filter(Boolean).join('/');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function gitBlobSha1(bytes: Uint8Array): Promise<string> {
  const header = strToU8(`blob ${bytes.byteLength}\0`);
  const content = new Uint8Array(header.byteLength + bytes.byteLength);
  content.set(header);
  content.set(bytes, header.byteLength);
  const digest = await crypto.subtle.digest('SHA-1', content);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function imageMimeType(filename: string): string {
  switch (filename.split('.').pop()?.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}

function hydrateMedia(
  value: unknown,
  archiveRoot: string,
  entries: Record<string, Uint8Array>,
): void {
  if (Array.isArray(value)) {
    value.forEach((child) => hydrateMedia(child, archiveRoot, entries));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  const kind = object.type;
  const content = object.content;
  if (
    (kind === 'image' || kind === 'svg') &&
    typeof content === 'string' &&
    !content.startsWith('data:') &&
    !content.startsWith('http') &&
    !(kind === 'svg' && content.trimStart().startsWith('<svg'))
  ) {
    const relativePath = normalizeArchivePath(content);
    const archivePath = normalizeArchivePath(
      archiveRoot ? `${archiveRoot}/${relativePath}` : relativePath,
    );
    const imageBytes = entries[archivePath];
    if (!imageBytes) {
      throw new Error(`Set-Medium ${content} fehlt in der ZIP-Datei.`);
    }
    object.content = kind === 'svg' || relativePath.toLowerCase().endsWith('.svg')
      ? strFromU8(imageBytes)
      : `data:${imageMimeType(relativePath)};base64,${bytesToBase64(imageBytes)}`;
  }

  Object.values(object).forEach((child) => hydrateMedia(child, archiveRoot, entries));
}

export async function readSetArchive(
  bytes: Uint8Array,
  metadata: SetArchiveMetadata = {},
): Promise<CardSet> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SET_ARCHIVE_BYTES) {
    throw new Error('Die ZIP-Datei ist leer oder größer als 100 MB.');
  }

  validateArchiveLimits(bytes);
  const entries = unzipSync(bytes);
  const names = Object.keys(entries);
  if (names.length > MAX_SET_ARCHIVE_FILES) {
    throw new Error(`Die ZIP-Datei enthält mehr als ${MAX_SET_ARCHIVE_FILES} Einträge.`);
  }

  const normalizedEntries: Record<string, Uint8Array> = {};
  let expandedBytes = 0;
  for (const name of names) {
    const normalized = normalizeArchivePath(name);
    if (normalized && !name.endsWith('/')) {
      if (normalizedEntries[normalized]) {
        throw new Error(`Doppelter Pfad in der ZIP-Datei: ${normalized}`);
      }
      normalizedEntries[normalized] = entries[name];
      expandedBytes += entries[name].byteLength;
      if (expandedBytes > MAX_SET_ARCHIVE_BYTES) {
        throw new Error('Der entpackte Inhalt der ZIP-Datei ist größer als 100 MB.');
      }
    }
  }

  const setFiles = Object.keys(normalizedEntries).filter((name) =>
    name.split('/').pop()?.toLowerCase() === 'set.json'
  );
  if (setFiles.length !== 1) {
    throw new Error(
      setFiles.length === 0
        ? 'In der ZIP-Datei wurde keine set.json gefunden.'
        : 'Die ZIP-Datei muss genau einen Set-Ordner mit set.json enthalten.',
    );
  }

  const setFile = setFiles[0];
  const archiveRoot = setFile.includes('/')
    ? setFile.slice(0, setFile.lastIndexOf('/'))
    : '';
  const set = JSON.parse(strFromU8(normalizedEntries[setFile])) as CardSet;
  if (!set || typeof set.title !== 'string' || !Array.isArray(set.pairs)) {
    throw new Error('Die set.json enthält kein gültiges Kartenset.');
  }

  hydrateMedia(set, archiveRoot, normalizedEntries);
  if (metadata.sourceArchiveSha) {
    set.sourceArchiveSha = metadata.sourceArchiveSha;
  } else {
    set.sourceArchiveSha = await gitBlobSha1(bytes);
  }
  if (metadata.archiveName) set.sourceArchiveName = metadata.archiveName;
  if (metadata.sourceRepoPath) set.sourceRepoPath = metadata.sourceRepoPath;
  return set;
}

function safeArchiveComponent(value: string): string {
  const clean = Array.from(value, (character) =>
    /[\p{L}\p{N} _.-]/u.test(character) ? character : '_'
  ).join('');
  const shortened = Array.from(clean.replace(/^[ .]+|[ .]+$/g, '')).slice(0, 80).join('');
  return shortened || 'Kartenset';
}

function base64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function writeSetArchive(set: CardSet): Uint8Array {
  const packagedSet = JSON.parse(JSON.stringify(set)) as CardSet;
  delete packagedSet.sourceArchiveSha;
  delete packagedSet.sourceArchiveName;
  delete packagedSet.sourceRepoPath;

  const root = safeArchiveComponent(set.title);
  const files: Record<string, Uint8Array> = {
    [`${root}/`]: new Uint8Array(),
  };
  let mediaIndex = 0;

  const saveMedia = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(saveMedia);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const object = value as Record<string, unknown>;
    const kind = object.type;
    const content = object.content;
    if (typeof content === 'string') {
      let filename: string | null = null;
      let mediaBytes: Uint8Array | null = null;
      if (kind === 'image' && content.startsWith('data:image/')) {
        const [header, encoded] = content.split(',', 2);
        const mime = header?.slice(5).replace(';base64', '');
        const extension: Record<string, string> = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg',
        };
        const ext = mime ? extension[mime] : undefined;
        if (!encoded || !ext) {
          throw new Error('Das Bildformat kann nicht in ein ZIP-Set exportiert werden.');
        }
        filename = `grafik-${String(++mediaIndex).padStart(4, '0')}.${ext}`;
        mediaBytes = base64ToBytes(encoded);
      } else if (kind === 'svg' && content.trimStart().startsWith('<svg')) {
        filename = `grafik-${String(++mediaIndex).padStart(4, '0')}.svg`;
        mediaBytes = strToU8(content);
      }
      if (filename && mediaBytes) {
        object.content = `Bilder/${filename}`;
        files[`${root}/Bilder/${filename}`] = mediaBytes;
        files[`${root}/Bilder/`] = new Uint8Array();
      }
    }
    Object.values(object).forEach(saveMedia);
  };

  saveMedia(packagedSet);
  files[`${root}/set.json`] = strToU8(JSON.stringify(packagedSet, null, 2));
  return zipSync(files, { level: 6 });
}

export async function gitArchiveSha1(bytes: Uint8Array): Promise<string> {
  return gitBlobSha1(bytes);
}
