import {createSignal, onCleanup, onMount} from 'solid-js'

import {type LanguageLearningWord} from './word-schema'
import {LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, readLanguageLearningWords} from './word-storage'

export const useLanguageLearningWords = () => {
  const [words, setWords] = createSignal<ReadonlyArray<LanguageLearningWord>>([])

  onMount(() => {
    const refresh = () => setWords(readLanguageLearningWords())
    refresh()
    window.addEventListener(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, refresh)
    onCleanup(() => window.removeEventListener(LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, refresh))
  })

  return words
}
