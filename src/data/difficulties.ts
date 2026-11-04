import { Difficulty, DifficultyConfig } from '../types/memory';

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Leicht',
    pairs: 6,
    totalCards: 12,
    colsDesktop: 4,
    description: '12 Karten (6 Paare) · Ideal zum Einstieg & Lernen',
    recommendedTimeSec: 60,
  },
  medium: {
    id: 'medium',
    label: 'Mittel',
    pairs: 8,
    totalCards: 16,
    colsDesktop: 4,
    description: '16 Karten (8 Paare) · Der klassische 4x4 Standard',
    recommendedTimeSec: 90,
  },
  hard: {
    id: 'hard',
    label: 'Fortgeschritten',
    pairs: 10,
    totalCards: 20,
    colsDesktop: 5,
    description: '20 Karten (10 Paare) · Für Geübte',
    recommendedTimeSec: 130,
  },
  expert: {
    id: 'expert',
    label: 'Schwer',
    pairs: 12,
    totalCards: 24,
    colsDesktop: 6,
    description: '24 Karten (12 Paare) · Echte Gedächtnisprüfung',
    recommendedTimeSec: 180,
  },
  master: {
    id: 'master',
    label: 'Meister',
    pairs: 18,
    totalCards: 36,
    colsDesktop: 6,
    description: '36 Karten (18 Paare) · Das ultimative 6x6 Lern-Duell',
    recommendedTimeSec: 260,
  },
};
