import { CardPair, CardProperty } from '../types/memory';

const DRAWING_KEYWORDS = [
  'struktur',
  'darstellung',
  'zeichnung',
  'zeichnen',
  'skizze',
  'abbildung',
  'bild',
  'grafik',
  'diagramm',
  'molekülmodell',
  'molekuelmodell',
  'molekülstruktur',
  'molekuelstruktur',
  'skelettformel',
  'valenzstrichformel',
  'lewis-formel',
  'konstitutionsformel',
  'projektionsformel',
  'stereodarstellung',
  'reaktionsschema',
  'reaktionsmechanismus',
  '3d-',
  'structure',
  'structural',
  'depiction',
  'drawing',
  'skeletal formula',
  'molecular model',
  'reaction mechanism',
];

const NON_DRAWING_KEYWORDS = [
  'summenformel',
  'molekülformel',
  'molekuelformel',
  'empirische formel',
  'smiles',
  'inchi',
  'line notation',
  'textformel',
  'abkürzung',
  'abkuerzung',
  'notation',
  'schriftlich',
];

function isDrawingLabel(key: string, label: string): boolean {
  const normalized = `${key} ${label}`.toLocaleLowerCase('de-DE');

  if (NON_DRAWING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return DRAWING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function getDrawingProperty(
  pair: CardPair,
  availableProperties: { key: string; label: string }[] = []
): CardProperty | null {
  const propertyMetadata = new Map(availableProperties.map((property) => [property.key, property.label]));
  const definedProperties = Object.values(pair.properties || {});
  const candidates = definedProperties.length > 0
    ? definedProperties
    : [
        {
          id: `${pair.id}_A`,
          key: 'A',
          label: pair.cardA.label || propertyMetadata.get('A') || '',
          content: pair.cardA.content,
          type: pair.cardA.type,
        },
        {
          id: `${pair.id}_B`,
          key: 'B',
          label: pair.cardB.label || propertyMetadata.get('B') || '',
          content: pair.cardB.content,
          type: pair.cardB.type,
        },
      ];

  return candidates.find((property) => {
    const metadataLabel = propertyMetadata.get(property.key) || '';
    return property.content.trim().length > 0 &&
      isDrawingLabel(property.key, `${property.label} ${metadataLabel}`);
  }) || null;
}

export function canUseDrawingMode(
  cardSet: { pairs: CardPair[]; availableProperties?: { key: string; label: string }[] }
): boolean {
  return cardSet.pairs.length > 0 &&
    cardSet.pairs.every((pair) => getDrawingProperty(pair, cardSet.availableProperties) !== null);
}
