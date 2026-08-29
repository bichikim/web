import {createSignal, onCleanup, onMount} from 'solid-js'

import {type LanguageLearningSentence} from './schema'
import {LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT, readLanguageLearningSentences} from './storage'

export const useLanguageLearningSentences = () => {
  const [sentences, setSentences] = createSignal<ReadonlyArray<LanguageLearningSentence>>([])

  onMount(() => {
    const refresh = () => setSentences(readLanguageLearningSentences())
    refresh()
    window.addEventListener(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT, refresh)
    onCleanup(() => window.removeEventListener(LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT, refresh))
  })

  return sentences
}
