export const NORMALIZATION_VERSION = 'nfc-whitespace-punctuation-v1'

export const normalizeText = (text: string): string =>
  text
    .normalize('NFC')
    .trim()
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[。．]/gu, '.')
    .replace(/\s+/gu, ' ')
