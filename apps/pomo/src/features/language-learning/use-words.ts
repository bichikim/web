import {createSignal, onCleanup, onMount} from 'solid-js'

import type {LanguageLearningStorageOptions} from './storage'
import {type LanguageLearningWord} from './word-schema'
import {LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, readLanguageLearningWords} from './word-storage'

export const useLanguageLearningWords = (options: LanguageLearningStorageOptions = {}) => {
  const [words, setWords] = createSignal<ReadonlyArray<LanguageLearningWord>>([])

  onMount(() => {
    const refresh = () => setWords(readLanguageLearningWords(options))
    refresh()
    const events = options.events ?? globalThis
    events.addEventListener(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, refresh)
    onCleanup(() => events.removeEventListener(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, refresh))
  })

  return words
}
