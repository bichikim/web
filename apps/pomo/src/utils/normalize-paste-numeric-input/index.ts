/** Normalizes fullwidth digits and pasted numeric signs without changing other text. */
export const normalizePasteNumericInput = (value: string): string =>
  value.replace(/[０-９＋－]/gu, (character) => character.normalize('NFKC')).replaceAll('−', '-')
