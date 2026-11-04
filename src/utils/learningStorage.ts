import { CardMastery, MasteryLevel, SelfAssessmentRating, SetMasteryProgress } from '../types/memory';
import { reportAppError } from './errorReporting';

const MASTERY_PREFIX = 'memomaster_mastery_';
const GLOBAL_MASTERY_KEY = 'memomaster_mastery_global';

export type CardLearningClassification = 'mastered' | 'uncertain' | 'incorrect' | 'new';

export function getGlobalMastery(): Record<string, CardMastery> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(GLOBAL_MASTERY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (error) {
    reportAppError(error, 'Globalen Lernfortschritt laden');
    return {};
  }
}

export function saveGlobalMastery(map: Record<string, CardMastery>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_MASTERY_KEY, JSON.stringify(map));
  } catch (err) {
    reportAppError(err, 'Globalen Lernfortschritt speichern');
  }
}

export function getSetMastery(setId: string): Record<string, CardMastery> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${MASTERY_PREFIX}${setId}`);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (error) {
    reportAppError(error, 'Lernfortschritt des Sets laden');
    return {};
  }
}

export function saveSetMastery(setId: string, masteryMap: Record<string, CardMastery>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${MASTERY_PREFIX}${setId}`, JSON.stringify(masteryMap));
  } catch (err) {
    reportAppError(err, 'Lernfortschritt des Sets speichern');
  }
}

export function resetSetMastery(setId?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (setId) {
      localStorage.removeItem(`${MASTERY_PREFIX}${setId}`);
    } else {
      localStorage.removeItem(GLOBAL_MASTERY_KEY);
      // Remove all set masteries
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(MASTERY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    reportAppError(err, 'Lernfortschritt zurücksetzen');
  }
}

export function getConceptMastery(conceptId: string, setId?: string): CardMastery | undefined {
  if (setId) {
    const setMap = getSetMastery(setId);
    if (setMap[conceptId]) return setMap[conceptId];
  }
  const globalMap = getGlobalMastery();
  if (globalMap[conceptId]) return globalMap[conceptId];
  return undefined;
}

export function classifyCardMastery(mastery?: CardMastery): {
  status: CardLearningClassification;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
  accuracyPercentage: number;
} {
  if (!mastery || mastery.reviewCount === 0) {
    return {
      status: 'new',
      label: 'Noch nicht geübt',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      description: 'Karte wurde bisher noch nicht im Spiel oder Selbsttest abgefragt.',
      accuracyPercentage: 0,
    };
  }

  const accuracy = Math.round((mastery.correctCount / mastery.reviewCount) * 100);

  // 1. "Sehr gut erkannt": At least 2 reviews, 100% correct OR high level + high accuracy
  if (
    (mastery.correctCount >= 2 && mastery.incorrectCount === 0 && mastery.uncertainCount === 0) ||
    (mastery.level >= 3 && accuracy >= 70 && mastery.incorrectCount <= 1)
  ) {
    return {
      status: 'mastered',
      label: 'Sehr gut erkannt',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
      dotClass: 'bg-emerald-500',
      description: 'Zuverlässig und sicher im Langzeitgedächtnis abrufbar.',
      accuracyPercentage: accuracy,
    };
  }

  // 2. "Häufig falsch": High error count or lower than 50% accuracy or recent mistake
  if (
    mastery.incorrectCount >= 2 ||
    (mastery.incorrectCount > 0 && accuracy < 50) ||
    (mastery.incorrectCount > mastery.correctCount)
  ) {
    return {
      status: 'incorrect',
      label: 'Häufig falsch',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
      dotClass: 'bg-rose-500',
      description: 'Wiederholter Fehler oder Verwechslung. Wird häufiger abgefragt.',
      accuracyPercentage: accuracy,
    };
  }

  // 3. "Unsicher": Has mistakes or uncertain ratings or moderate accuracy
  return {
    status: 'uncertain',
    label: 'Unsicher',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
    dotClass: 'bg-amber-500',
    description: 'Noch nicht gefestigt. Benötigt weitere Wiederholungen.',
    accuracyPercentage: accuracy,
  };
}

export function recordConceptReview(
  setId: string,
  conceptId: string,
  rating: SelfAssessmentRating
): CardMastery {
  const masteryMap = getSetMastery(setId);
  const globalMap = getGlobalMastery();
  const now = new Date().toISOString();

  const existing: CardMastery = masteryMap[conceptId] || globalMap[conceptId] || {
    conceptId,
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    uncertainCount: 0,
    level: 0,
    weight: 4.0, // default weight for new items
    lastReviewed: now,
  };

  existing.reviewCount += 1;
  existing.lastReviewed = now;

  if (rating === 'correct') {
    existing.correctCount += 1;
    existing.level = Math.min(4, existing.level + 1) as MasteryLevel;
    existing.weight = Math.max(1.0, existing.weight * 0.6);
  } else if (rating === 'uncertain') {
    existing.uncertainCount += 1;
    if (existing.level > 2) existing.level = 2;
    existing.weight = Math.min(10.0, existing.weight * 1.4 + 1.0);
  } else if (rating === 'incorrect') {
    existing.incorrectCount += 1;
    existing.level = 1;
    existing.weight = Math.min(15.0, existing.weight * 2.2 + 2.5);
  }

  masteryMap[conceptId] = existing;
  saveSetMastery(setId, masteryMap);

  // Also sync globally
  globalMap[conceptId] = existing;
  saveGlobalMastery(globalMap);

  // If pooled set with embedded source id (e.g. pharma-structures_aspirin)
  if (conceptId.includes('_')) {
    const [subSetId, subConceptId] = conceptId.split('_');
    if (subSetId && subConceptId) {
      const subMap = getSetMastery(subSetId);
      subMap[subConceptId] = { ...existing, conceptId: subConceptId };
      saveSetMastery(subSetId, subMap);
    }
  }

  return existing;
}

export function getSetMasterySummary(
  setId: string,
  conceptIds: string[]
): SetMasteryProgress {
  const masteryMap = getSetMastery(setId);
  const total = conceptIds.length;

  let newCount = 0;
  let learningCount = 0;
  let practicingCount = 0;
  let masteredCount = 0;

  conceptIds.forEach((id) => {
    const item = masteryMap[id];
    if (!item || item.reviewCount === 0) {
      newCount++;
    } else if (item.level === 1) {
      learningCount++;
    } else if (item.level === 2) {
      practicingCount++;
    } else {
      masteredCount++;
    }
  });

  const percentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  return {
    total,
    newCount,
    learningCount,
    practicingCount,
    masteredCount,
    percentage,
  };
}

/**
 * Weighted random selection of items without replacement (Efraimidis-Spirakis algorithm)
 * Items with higher weights appear significantly more often.
 */
export function sampleWeightedConcepts<T extends { id: string }>(
  items: T[],
  count: number,
  setId: string
): T[] {
  if (items.length <= count) {
    // If fewer or equal, shuffle and return
    return [...items].sort(() => Math.random() - 0.5);
  }

  const masteryMap = getSetMastery(setId);

  // Calculate keys for weighted reservoir: r^(1/w) where r in (0,1]
  const keyed = items.map((item) => {
    const mastery = masteryMap[item.id];
    const weight = mastery ? mastery.weight : 4.0; // new items weight 4.0
    const r = Math.random();
    const key = Math.pow(r, 1 / Math.max(0.1, weight));
    return { item, key };
  });

  // Sort descending by key
  keyed.sort((a, b) => b.key - a.key);

  return keyed.slice(0, count).map((k) => k.item);
}
