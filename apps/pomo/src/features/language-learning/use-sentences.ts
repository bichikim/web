import {createSignal, onCleanup, onMount} from 'solid-js'

import {type LanguageLearningSentence} from './schema'
import {
  LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT,
  type LanguageLearningStorageOptions,
  readLanguageLearningSentences,
} from './storage'

export const useLanguageLearningSentences = (options: LanguageLearningStorageOptions = {}) => {
  const [sentences, setSentences] = createSignal<ReadonlyArray<LanguageLearningSentence>>([])

  onMount(() => {
    const refresh = () => setSentences(readLanguageLearningSentences(options))
    refresh()
    const events = options.events ?? globalThis
    events.addEventListener(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT, refresh)
    onCleanup(() => events.removeEventListener(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT, refresh))
  })

  return sentences
}
