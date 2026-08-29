import {LANGUAGE_LEARNING_SENTENCE_LIMITS} from './sentence'
import type {LanguageLearningLanguage} from './schema'

const LANGUAGE_NAMES = {en: 'English', ja: 'Japanese', ko: 'Korean'} as const

export interface CreateLanguageLearningPromptOptions {
  readonly existingSentences: ReadonlyArray<string>
  readonly language: LanguageLearningLanguage
  readonly tags: ReadonlyArray<string>
  readonly wordRequirement: 'all' | 'at-least-one'
}

export const createLanguageLearningPrompt = (options: CreateLanguageLearningPromptOptions) => {
  const limits = LANGUAGE_LEARNING_SENTENCE_LIMITS[options.language]
  const wordLimit = limits.words === null ? '' : ` and at most ${limits.words} words`
  const exclusions =
    options.existingSentences.length === 0
      ? 'None'
      : options.existingSentences.map((sentence) => `- ${sentence}`).join('\n')
  const wordInstruction =
    options.wordRequirement === 'all'
      ? `Use every target word or phrase naturally: ${options.tags.join(', ')}`
      : `Use at least one of these provided words or phrases naturally: ${options.tags.join(', ')}`

  return `Write one natural, moderately detailed ${LANGUAGE_NAMES[options.language]} sentence for language study.
${wordInstruction}
You may change tense, conjugation, inflection, number, or case when natural.
You may also change part of speech when natural, but preserve the original meaning.
Return only the sentence with no translation, label, list marker, or quotation marks.
Use exactly one sentence ending punctuation mark.
Maximum length: ${limits.characters} characters${wordLimit}.
Do not repeat these earlier sentences:
${exclusions}`
}
