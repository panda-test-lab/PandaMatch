export type CardContentType = 'emoji' | 'image' | 'text' | 'svg' | 'latex';

export interface CardProperty {
  id: string;
  key: string; // e.g. 'structure', 'name', 'class', 'indication'
  label: string; // e.g. 'Strukturformel', 'Wirkstoffname', 'Wirkstoffklasse', 'Indikation'
  content: string;
  type: CardContentType;
}

export interface ConceptItem {
  id: string;
  title: string;
  properties: Record<string, CardProperty>;
}

// Backward-compatible alias for existing code
export interface CardPair {
  id: string;
  title: string;
  cardA: {
    content: string;
    type: CardContentType;
    label?: string;
  };
  cardB: {
    content: string;
    type: CardContentType;
    label?: string;
  };
  // Extended multi-properties
  properties?: Record<string, CardProperty>;
}

export interface CardSet {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  pairs: CardPair[];
  concepts?: ConceptItem[];
  availableProperties?: { key: string; label: string }[];
  isCustom?: boolean;
  createdAt?: string;
  sourceArchiveSha?: string;
  sourceArchiveName?: string;
  sourceRepoPath?: string;
}

export interface CardItem {
  id: string;
  conceptId: string;
  pairId: string; // backward compat
  propertyKey: string;
  propertyLabel: string;
  propertyColorIndex?: number; // 0, 1, 2, 3 for colored card backs in extended mode
  side: string;
  content: string;
  type: CardContentType;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
  isPeeked?: boolean;
  isSelected?: boolean;
  isMismatchAnim?: boolean;
  isOutlierMismatch?: boolean; // Highlighted in red if this specific card was wrong
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  pairs: number;
  totalCards: number;
  colsDesktop: number;
  description: string;
  recommendedTimeSec: number;
}

export type GameMode = 'solo' | 'versus';
export type BoardDisplayMode = 'classic' | 'open' | 'recall';
export type GameVariant = 'original' | 'extended' | 'open';

// Spaced Repetition Mastery Levels
export type MasteryLevel = 0 | 1 | 2 | 3 | 4; // 0=Neu, 1=Lernbedarf, 2=In Übung, 3=Gefestigt, 4=Gemeistert

export interface CardMastery {
  conceptId: string;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  uncertainCount: number;
  level: MasteryLevel;
  weight: number; // Higher weight = higher probability of appearing
  lastReviewed: string; // ISO string
}

export interface SetMasteryProgress {
  total: number;
  newCount: number;
  learningCount: number; // Level 1
  practicingCount: number; // Level 2
  masteredCount: number; // Level 3 & 4
  percentage: number;
}

export type SelfAssessmentRating = 'correct' | 'uncertain' | 'incorrect';

export interface HighscoreEntry {
  id: string;
  playerName: string;
  difficulty: Difficulty;
  pairsCount?: number;
  modeVariant?: GameVariant;
  setId: string;
  setName: string;
  moves: number;
  timeSeconds: number;
  score: number;
  accuracy: number;
  date: string;
  mode: GameMode;
  boardMode?: BoardDisplayMode;
  propertiesCount?: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTimeSec: number | null;
  fewestMoves: number | null;
  totalMatches: number;
  favoriteSetId: string | null;
  recallSessionsCompleted?: number;
  masteredConceptsTotal?: number;
}
