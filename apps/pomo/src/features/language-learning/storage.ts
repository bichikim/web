import {z} from 'zod'

import {type LanguageLearningSentence, languageLearningSentenceSchema} from './schema'

const STORAGE_KEY = 'pomo:language-learning:sentences:v1'
export const LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT = 'pomo:language-learning:sentences-changed'
const storedSentencesSchema = z.array(languageLearningSentenceSchema).readonly()

export const readLanguageLearningSentences = (): ReadonlyArray<LanguageLearningSentence> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? [] : storedSentencesSchema.parse(JSON.parse(stored))
  } catch (error: unknown) {
    console.warn('Failed to read language learning sentences.', error)
    return []
  }
}

export const writeLanguageLearningSentences = (
  sentences: ReadonlyArray<LanguageLearningSentence>,
) => {
  const parsed = storedSentencesSchema.parse(sentences)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  window.dispatchEvent(new CustomEvent(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT))
}

export const appendLanguageLearningSentences = (
  sentences: ReadonlyArray<LanguageLearningSentence>,
) => writeLanguageLearningSentences([...readLanguageLearningSentences(), ...sentences])

export const deleteLanguageLearningSentence = (dialogueId: string) =>
  writeLanguageLearningSentences(
    readLanguageLearningSentences().filter((sentence) => sentence.dialogueId !== dialogueId),
  )
