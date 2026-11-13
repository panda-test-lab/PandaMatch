import { gitArchiveSha1 } from './setArchives';

const REPOSITORY_API = 'https://api.github.com/repos/panda-test-lab/PandaMatch_Sets';
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

export interface RepositorySetArchive {
  path: string;
  sha: string;
  size: number;
}

interface GitTreeResponse {
  truncated: boolean;
  tree: Array<{
    path: string;
    sha: string;
    size?: number;
    type: string;
  }>;
}

export async function listRepositorySetArchives(): Promise<RepositorySetArchive[]> {
  const response = await fetch(`${REPOSITORY_API}/git/trees/main?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (response.status === 409) return [];
  if (!response.ok) {
    throw new Error(`GitHub konnte die Set-Liste nicht laden (HTTP ${response.status}).`);
  }

  const result = await response.json() as GitTreeResponse;
  if (result.truncated) {
    throw new Error('Das Repository enthält zu viele Dateien für eine vollständige Set-Liste.');
  }

  return result.tree
    .filter((entry) => entry.type === 'blob' && /\.zip$/i.test(entry.path))
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: entry.size ?? 0,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export async function downloadRepositorySetArchive(
  archive: RepositorySetArchive,
): Promise<Uint8Array> {
  if (archive.size > MAX_ARCHIVE_BYTES) {
    throw new Error('Diese ZIP-Datei ist größer als 100 MB und kann nicht importiert werden.');
  }

  const response = await fetch(`${REPOSITORY_API}/git/blobs/${archive.sha}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub konnte ${archive.path} nicht laden (HTTP ${response.status}).`);
  }

  const blob = await response.json() as { content?: string; encoding?: string };
  if (blob.encoding !== 'base64' || typeof blob.content !== 'string') {
    throw new Error(`GitHub hat ${archive.path} nicht als Base64-ZIP geliefert.`);
  }

  const binary = atob(blob.content.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (await gitArchiveSha1(bytes) !== archive.sha) {
    throw new Error(`Die Prüfsumme von ${archive.path} stimmt nicht mit GitHub überein.`);
  }
  return bytes;
}
