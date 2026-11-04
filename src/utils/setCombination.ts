import { CardSet, CardPair } from '../types/memory';

export interface PropertyIntersectionMeta {
  key: string;
  label: string;
  isShared: boolean;
  missingSets: string[];
}

export interface SetIntersectionResult {
  allProperties: PropertyIntersectionMeta[];
  sharedProperties: { key: string; label: string }[];
}

/**
 * Computes the intersection of available properties across one or more chosen card sets.
 * If a property is present in ALL chosen sets, it is marked isShared: true.
 * If a property is missing in one or more sets, it is isShared: false and lists the missing sets.
 */
export function computeSetsPropertyIntersection(selectedSets: CardSet[]): SetIntersectionResult {
  if (!selectedSets || selectedSets.length === 0) {
    return { allProperties: [], sharedProperties: [] };
  }

  // Collect map of property keys to labels and sets in which they are present
  const propMap = new Map<
    string,
    { label: string; setsPresent: Set<string>; firstType?: string }
  >();

  selectedSets.forEach((set) => {
    let props = set.availableProperties && set.availableProperties.length >= 2
      ? set.availableProperties
      : [];

    // Fallback: If availableProperties is not explicitly defined, inspect card pairs
    if (props.length === 0 && set.pairs && set.pairs.length > 0) {
      const sample = set.pairs[0];
      if (sample.properties && Object.keys(sample.properties).length >= 2) {
        props = Object.entries(sample.properties).map(([k, v]) => ({
          key: k,
          label: v.label || k,
        }));
      } else {
        props = [
          { key: 'A', label: sample.cardA.label || 'Vorderseite' },
          { key: 'B', label: sample.cardB.label || 'Rückseite' },
        ];
      }
    }

    props.forEach((p) => {
      if (!propMap.has(p.key)) {
        propMap.set(p.key, {
          label: p.label,
          setsPresent: new Set<string>(),
        });
      }
      propMap.get(p.key)!.setsPresent.add(set.id);
    });
  });

  const totalSelected = selectedSets.length;
  const allProperties: PropertyIntersectionMeta[] = [];
  const sharedProperties: { key: string; label: string }[] = [];

  propMap.forEach((info, key) => {
    const isShared = info.setsPresent.size === totalSelected;
    const missingSets = selectedSets
      .filter((s) => !info.setsPresent.has(s.id))
      .map((s) => s.title);

    allProperties.push({
      key,
      label: info.label,
      isShared,
      missingSets,
    });

    if (isShared) {
      sharedProperties.push({
        key,
        label: info.label,
      });
    }
  });

  return { allProperties, sharedProperties };
}

/**
 * Combines one or multiple CardSets into a pooled CardSet for a game round.
 * Sets unique IDs so concepts across sets do not collide.
 */
export function createPooledCardSet(
  selectedSets: CardSet[],
  customTitle?: string
): CardSet {
  if (!selectedSets || selectedSets.length === 0) {
    throw new Error('Mindestens ein Kartenset muss ausgewählt werden.');
  }

  if (selectedSets.length === 1) {
    return selectedSets[0];
  }

  const combinedPairs: CardPair[] = [];
  const seenPairIds = new Set<string>();

  selectedSets.forEach((set) => {
    set.pairs.forEach((pair, idx) => {
      const uniqueId = `${set.id}_${pair.id || idx}`;
      if (!seenPairIds.has(uniqueId)) {
        seenPairIds.add(uniqueId);
        combinedPairs.push({
          ...pair,
          id: uniqueId,
          title: pair.title,
        });
      }
    });
  });

  const { sharedProperties } = computeSetsPropertyIntersection(selectedSets);

  return {
    id: `pooled-${Date.now()}`,
    title: customTitle || `Gemischte Sets (${selectedSets.length})`,
    description: `Kombiniert aus: ${selectedSets.map((s) => s.title).join(', ')}`,
    category: 'Gemischte Sets',
    icon: '🎲',
    color: 'emerald',
    pairs: combinedPairs,
    availableProperties: sharedProperties,
  };
}
