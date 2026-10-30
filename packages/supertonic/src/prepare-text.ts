import type {SupertonicLanguage} from './language'

/** Prepares normalized, language-tagged text for Supertonic model inputs. */
export const prepareText = (input: string, language: SupertonicLanguage): string => {
  let text = input
    .normalize('NFKD')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, '')
    .replace(/[–‑—]/gu, '-')
    .replace(/[[\]_|/#→←]/gu, ' ')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’´`]/gu, "'")
    .replace(/[♥☆♡©\\]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()

  if (!/[.!?;:,'")\]}…。」』】〉》›»]$/u.test(text)) {
    text += '.'
  }

  return `<${language}>${text}</${language}>`
}
