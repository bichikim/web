import {
  isValidLanguageLearningSentence,
  type LanguageLearningLanguage,
  normalizeLanguageLearningSentence,
} from '../../features/language-learning'

const MAXIMUM_RETRIES = 2

export interface ResolveSentenceGenerationOptions {
  readonly count: number
  readonly language: LanguageLearningLanguage
  readonly output: string
  readonly retryCount: number
  readonly sentences: ReadonlyArray<string>
}

interface CompleteSentenceGeneration {
  readonly kind: 'complete'
  readonly sentences: ReadonlyArray<string>
}

interface ContinueSentenceGeneration {
  readonly kind: 'continue'
  readonly sentences: ReadonlyArray<string>
}

interface InvalidSentenceGeneration {
  readonly kind: 'invalid'
}

interface RetrySentenceGeneration {
  readonly kind: 'retry'
  readonly retryCount: number
}

export type SentenceGenerationResolution =
  | CompleteSentenceGeneration
  | ContinueSentenceGeneration
  | InvalidSentenceGeneration
  | RetrySentenceGeneration

export const resolveSentenceGeneration = (
  options: ResolveSentenceGenerationOptions,
): SentenceGenerationResolution => {
  const sentence = normalizeLanguageLearningSentence(options.output)

  if (!isValidLanguageLearningSentence(sentence, options.language)) {
    if (options.retryCount < MAXIMUM_RETRIES) {
      return {kind: 'retry', retryCount: options.retryCount + 1}
    }

    return {kind: 'invalid'}
  }

  const sentences = [...options.sentences, sentence]

  return sentences.length === options.count
    ? {kind: 'complete', sentences}
    : {kind: 'continue', sentences}
}
