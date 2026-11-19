const UNAVAILABLE_PATTERNS = [
  /\bnicht\s+(?:vorhanden|moeglich|verfuegbar|machbar|bekannt|anwendbar|zutreffend|relevant|ermittelbar|darstellbar|gegeben)\b/,
  /\bkeine?\s+(?:angabe|daten|informationen?|struktur|abbildung|loesung|messwerte?)\b/,
  /\b(?:entfaellt|unavailable|not\s+(?:available|possible|applicable|present|found|provided))\b/,
  /\bohne\s+(?:angabe|daten|abbildung)\b/,
  /\bn\s+(?:a|v)\b/,
];

export function isUnavailableContent(content: string): boolean {
  const normalized = content
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  return UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(normalized));
}
