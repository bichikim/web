/** Normalizes pasted numeric digits, signs, and fullwidth commas without changing other text. */
export const normalizePasteNumericInput = (value: string): string =>
  value
    .replace(/[０-９＋－]/gu, (character) => character.normalize('NFKC'))
    .replace(/^(?<leadingWhitespace>\s*)[‒–﹣]/u, '$<leadingWhitespace>-')
    .replaceAll('−', '-')
    .replaceAll('，', ',')
