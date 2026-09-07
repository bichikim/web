import {Title} from '@solidjs/meta'
import {createMemo, createResource, ErrorBoundary, Show, Suspense} from 'solid-js'

import {
  appendLanguageLearningWords,
  loadLanguageLearningWordSets,
  localizeLanguageLearningWordSet,
} from 'src/features/language-learning'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {LanguageLearningWordSets} from '../../components/language-learning/WordSets'

export default function LanguageLearningWordSetsPage() {
  const [wordSets] = createResource(loadLanguageLearningWordSets)
  const localizedWordSets = createMemo(() =>
    wordSets()?.map((wordSet) => localizeLanguageLearningWordSet(wordSet, getLocale())),
  )
  const handleAddSet = (setId: string) => {
    const availableSets = wordSets()
    const set = availableSets?.find((availableSet) => availableSet.id === setId)

    if (set === undefined) {
      throw new Error(`Language learning word set not found: ${setId}`)
    }

    return appendLanguageLearningWords(set.language, set.words)
  }

  return (
    <>
      <Title>{`Pomofi — ${m.learning_word_sets_title()}`}</Title>
      <ErrorBoundary fallback={<p role="alert">{m.learning_word_sets_load_failed()}</p>}>
        <Suspense fallback={<p role="status">{m.learning_word_sets_loading()}</p>}>
          <Show keyed when={localizedWordSets()}>
            {(sets) => <LanguageLearningWordSets onAddSet={handleAddSet} sets={sets} />}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
