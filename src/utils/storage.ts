import { CardSet, HighscoreEntry, PlayerStats } from '../types/memory';
import { reportAppError } from './errorReporting';

const CUSTOM_SETS_KEY = 'memomaster_custom_card_sets';
const HIGHSCORES_KEY = 'memomaster_highscores';
const THEME_KEY = 'memomaster_theme';
const STATS_KEY = 'memomaster_player_stats';
const LAST_PLAYER_NAME_KEY = 'memomaster_player_name';

export function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // default to modern dark theme
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function setStoredTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const ALL_SETS_KEY = 'memomaster_all_card_sets';
const REMOVED_DEMO_SET_IDS = new Set([
  'chem-pharma',
  'botanik-pharma',
  'animals',
  'space',
  'food',
  'gaming',
  'world-travel',
]);

function isCardSet(value: unknown): value is CardSet {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string';
}

export function isRemovedDemoSet(set: CardSet): boolean {
  return REMOVED_DEMO_SET_IDS.has(set.id);
}

export function getAllCardSets(): CardSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALL_SETS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sets = parsed.filter((set): set is CardSet =>
          isCardSet(set) && !isRemovedDemoSet(set)
        );
        if (sets.length !== parsed.length) {
          localStorage.setItem(ALL_SETS_KEY, JSON.stringify(sets));
        }
        return sets;
      }
    }
    const initial = getCustomCardSets().filter((set) => !isRemovedDemoSet(set));
    localStorage.setItem(ALL_SETS_KEY, JSON.stringify(initial));
    return initial;
  } catch (err) {
    reportAppError(err, 'Kartensets aus dem Browserspeicher laden');
    return [];
  }
}

export function replaceAllCardSets(sets: CardSet[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALL_SETS_KEY, JSON.stringify(sets));
}

export function saveCardSet(set: CardSet): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const current = getAllCardSets();
    const index = current.findIndex((s) => s.id === set.id);
    if (index >= 0) {
      const existing = current[index];
      current[index] = {
        ...set,
        isCustom: true,
        sourceArchiveSha: set.sourceArchiveSha ?? existing.sourceArchiveSha,
        sourceArchiveName: set.sourceArchiveName ?? existing.sourceArchiveName,
        sourceRepoPath: set.sourceRepoPath ?? existing.sourceRepoPath,
      };
    } else {
      current.unshift({
        ...set,
        isCustom: true,
        createdAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(ALL_SETS_KEY, JSON.stringify(current));
    return true;
  } catch (err) {
    reportAppError(err, 'Kartenset im Browserspeicher speichern');
    return false;
  }
}

export function deleteCardSet(setId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const current = getAllCardSets();
    const filtered = current.filter((s) => s.id !== setId);
    localStorage.setItem(ALL_SETS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    reportAppError(err, 'Kartenset aus dem Browserspeicher löschen');
    return false;
  }
}

export function exportCardSetJson(set: CardSet): string {
  return JSON.stringify(set, null, 2);
}

export function importCardSetsJson(jsonText: string): {
  success: boolean;
  importedCount: number;
  message: string;
  importedSets: CardSet[];
} {
  try {
    const parsed = JSON.parse(jsonText);
    const rawSets: any[] = Array.isArray(parsed) ? parsed : [parsed];

    if (rawSets.length === 0) {
      return { success: false, importedCount: 0, message: 'Die JSON-Datei enthält keine Kartensets.', importedSets: [] };
    }

    const current = getAllCardSets();
    const validImported: CardSet[] = [];

    rawSets.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object' || !raw.title || !Array.isArray(raw.pairs)) {
        return; // skip invalid objects
      }

      const cleanId = raw.id || `imported_${Date.now()}_${idx}`;
      const cleanSet: CardSet = {
        id: cleanId,
        title: String(raw.title || 'Importiertes Set'),
        description: String(raw.description || 'Importiertes Kartenset mit Eigenschaften.'),
        category: String(raw.category || 'Importierte Sets'),
        icon: String(raw.icon || '📦'),
        color: raw.color || 'emerald',
        isCustom: true,
        availableProperties: Array.isArray(raw.availableProperties) ? raw.availableProperties : undefined,
        sourceArchiveSha: typeof raw.sourceArchiveSha === 'string' ? raw.sourceArchiveSha : undefined,
        sourceArchiveName: typeof raw.sourceArchiveName === 'string' ? raw.sourceArchiveName : undefined,
        sourceRepoPath: typeof raw.sourceRepoPath === 'string' ? raw.sourceRepoPath : undefined,
        pairs: raw.pairs.map((p: any, pIdx: number) => ({
          id: p.id || `pair_${Date.now()}_${pIdx}`,
          title: String(p.title || `Konzept ${pIdx + 1}`),
          details: p.details ? String(p.details) : undefined,
          cardA: {
            content: p.cardA?.content || 'Vorderseite',
            type: p.cardA?.type || 'text',
            label: p.cardA?.label,
            details: p.cardA?.details,
          },
          cardB: {
            content: p.cardB?.content || 'Rückseite',
            type: p.cardB?.type || 'text',
            label: p.cardB?.label,
            details: p.cardB?.details,
          },
          properties: p.properties || undefined,
          additionalInfo: Array.isArray(p.additionalInfo) ? p.additionalInfo : undefined,
        })),
        createdAt: raw.createdAt || new Date().toISOString(),
      };

      const existingIdx = current.findIndex((s) => s.id === cleanSet.id);
      if (existingIdx >= 0) {
        const existing = current[existingIdx];
        cleanSet.sourceArchiveSha ??= existing.sourceArchiveSha;
        cleanSet.sourceArchiveName ??= existing.sourceArchiveName;
        cleanSet.sourceRepoPath ??= existing.sourceRepoPath;
        current[existingIdx] = cleanSet;
      } else {
        current.unshift(cleanSet);
      }
      validImported.push(cleanSet);
    });

    if (validImported.length === 0) {
      return {
        success: false,
        importedCount: 0,
        message: 'Keine gültigen Kartensets im JSON-Format erkannt. Erwartet wird ein Objekt oder Array mit "title" und "pairs".',
        importedSets: [],
      };
    }

    localStorage.setItem(ALL_SETS_KEY, JSON.stringify(current));
    return {
      success: true,
      importedCount: validImported.length,
      message: `${validImported.length} Kartenset(s) mitsamt Eigenschaften erfolgreich importiert!`,
      importedSets: validImported,
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      message: `Fehler beim Parsen der JSON-Datei: ${err?.message || 'Ungültiges Format'}`,
      importedSets: [],
    };
  }
}

export function getCustomCardSets(): CardSet[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    reportAppError(error, 'Kartensets aus dem Browserspeicher wiederherstellen');
    return [];
  }
}

export function saveCustomCardSet(newSet: CardSet): boolean {
  return saveCardSet(newSet);
}

export function deleteCustomCardSet(setId: string): boolean {
  return deleteCardSet(setId);
}

export function getHighscores(): HighscoreEntry[] {
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY);
    if (!raw) {
      // Seed some friendly initial records so the leaderboard isn't an empty void
      const defaultScores: HighscoreEntry[] = [
        {
          id: 'seed-1',
          playerName: 'Gedächtnis-Profi',
          difficulty: 'medium',
          setId: 'animals',
          setName: 'Tiere der Wildnis',
          moves: 12,
          timeSeconds: 38,
          score: 840,
          accuracy: 88,
          date: new Date(Date.now() - 86400000 * 2).toLocaleDateString('de-DE'),
          mode: 'solo',
        },
        {
          id: 'seed-2',
          playerName: 'Memory-Meister',
          difficulty: 'easy',
          setId: 'food',
          setName: 'Kulinarische Welt',
          moves: 7,
          timeSeconds: 19,
          score: 950,
          accuracy: 94,
          date: new Date(Date.now() - 86400000 * 4).toLocaleDateString('de-DE'),
          mode: 'solo',
        },
        {
          id: 'seed-3',
          playerName: 'Astro-Denker',
          difficulty: 'hard',
          setId: 'space',
          setName: 'Weltraum & Kosmos',
          moves: 19,
          timeSeconds: 62,
          score: 1120,
          accuracy: 82,
          date: new Date(Date.now() - 86400000).toLocaleDateString('de-DE'),
          mode: 'solo',
        },
      ];
      localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(defaultScores));
      return defaultScores;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    reportAppError(error, 'Bestenliste laden');
    return [];
  }
}

export function saveHighscore(entry: Omit<HighscoreEntry, 'id'>): HighscoreEntry {
  const fullEntry: HighscoreEntry = {
    ...entry,
    id: `hs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  const scores = getHighscores();
  scores.push(fullEntry);
  // Sort by score descending (or time/moves if tied)
  scores.sort((a, b) => b.score - a.score || a.moves - b.moves || a.timeSeconds - b.timeSeconds);
  // Keep top 50
  const trimmed = scores.slice(0, 50);
  try {
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    reportAppError(error, 'Bestenliste speichern');
  }
  return fullEntry;
}

export function clearHighscores() {
  localStorage.removeItem(HIGHSCORES_KEY);
}

export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        bestTimeSec: null,
        fewestMoves: null,
        totalMatches: 0,
        favoriteSetId: null,
      };
    }
    return JSON.parse(raw);
  } catch (error) {
    reportAppError(error, 'Spielstatistik laden');
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTimeSec: null,
      fewestMoves: null,
      totalMatches: 0,
      favoriteSetId: null,
    };
  }
}

export function recordGameStats(win: boolean, timeSec: number, moves: number, matches: number, setId: string) {
  const current = getPlayerStats();
  current.gamesPlayed += 1;
  if (win) {
    current.gamesWon += 1;
    current.bestTimeSec = current.bestTimeSec === null ? timeSec : Math.min(current.bestTimeSec, timeSec);
    current.fewestMoves = current.fewestMoves === null ? moves : Math.min(current.fewestMoves, moves);
  }
  current.totalMatches += matches;
  current.favoriteSetId = setId;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(current));
  } catch (error) {
    reportAppError(error, 'Spielstatistik speichern');
  }
}

export function getStoredPlayerName(): string {
  return localStorage.getItem(LAST_PLAYER_NAME_KEY) || 'Spieler 1';
}

export function setStoredPlayerName(name: string) {
  localStorage.setItem(LAST_PLAYER_NAME_KEY, name.trim());
}

/**
 * Resizes and compresses an uploaded image file into a compact base64 data URL
 * to avoid exceeding localStorage limits.
 */
export async function optimizeUploadedImage(file: File, maxDimension = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Konnte Datei nicht lesen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ungültiges Bildformat.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export as WebP or standard JPEG
        const dataUrl = canvas.toDataURL('image/webp', 0.82) || canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
