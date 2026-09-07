import {createMemo, createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {formatModelDownloadSize} from '../../features/model-storage'
import {
  appendLanguageLearningWords,
  deleteLanguageLearningWords,
  type LanguageLearningLanguage,
  type LanguageLearningWord,
  parseLanguageLearningTags,
  setLanguageLearningWordsMemorized,
  useLanguageLearningWords,
} from '../../features/language-learning'
import {getSupertonicModel} from '../../features/supertonic'
import {PModelDownloadConsent} from '../PModelDownloadConsent'
import {LanguageLearningLanguageSelect} from './LanguageSelect'
import {useLanguageLearningWordPronunciation} from './use-word-pronunciation'
import {type LanguageLearningWordFilter, type LanguageLearningWordFilterView} from './words/filter'
import {LanguageLearningWordInputSection} from './words/InputSection'
import {LanguageLearningSavedWords} from './words/SavedWords'

const getLanguageLearningWordFilterView = (
  filter: LanguageLearningWordFilter,
  allWords: ReadonlyArray<LanguageLearningWord>,
  unmemorizedWords: ReadonlyArray<LanguageLearningWord>,
  memorizedWords: ReadonlyArray<LanguageLearningWord>,
): LanguageLearningWordFilterView => {
  switch (filter) {
    case 'all':
      return {emptyMessage: m.learning_words_empty(), words: allWords}
    case 'unmemorized':
      return {emptyMessage: m.learning_words_unmemorized_empty(), words: unmemorizedWords}
    case 'memorized':
      return {emptyMessage: m.learning_words_memorized_empty(), words: memorizedWords}
  }
}

const parseLanguageLearningWordFilter = (value: string): LanguageLearningWordFilter | null => {
  switch (value) {
    case 'all':
    case 'unmemorized':
    case 'memorized':
      return value
    default:
      return null
  }
}

const getSelectedLanguageLearningWords = (
  words: ReadonlyArray<LanguageLearningWord>,
  values: ReadonlyArray<string>,
) => {
  const selectedValues = new Set(values)
  return words.filter((word) => selectedValues.has(word.value))
}

const toggleLanguageLearningWordSelection = (
  values: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  values.includes(value)
    ? values.filter((selectedValue) => selectedValue !== value)
    : [...values, value]

export const LanguageLearningWords = () => {
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const [inputValue, setInputValue] = createSignal('')
  const [pendingWords, setPendingWords] = createSignal<ReadonlyArray<string>>([])
  const [message, setMessage] = createSignal<string | null>(null)
  const [wordFilter, setWordFilter] = createSignal<LanguageLearningWordFilter>('all')
  const [selectedWordValues, setSelectedWordValues] = createSignal<ReadonlyArray<string>>([])
  const pronunciation = useLanguageLearningWordPronunciation()
  const words = useLanguageLearningWords()
  const filteredWords = createMemo(() => words().filter((word) => word.language === language()))
  const unmemorizedWords = createMemo(() => filteredWords().filter((word) => !word.memorized))
  const memorizedWords = createMemo(() => filteredWords().filter((word) => word.memorized))
  const filterView = createMemo(() =>
    getLanguageLearningWordFilterView(
      wordFilter(),
      filteredWords(),
      unmemorizedWords(),
      memorizedWords(),
    ),
  )
  const selectedWords = createMemo(() =>
    getSelectedLanguageLearningWords(filterView().words, selectedWordValues()),
  )
  const wordsToSave = () => parseLanguageLearningTags([...pendingWords(), inputValue()].join(','))
  const handleLanguageChange = (value: LanguageLearningLanguage) => {
    setSelectedWordValues([])
    setLanguage(value)
  }
  const handleWordFilterChange = (value: string) => {
    const nextFilter = parseLanguageLearningWordFilter(value)
    if (nextFilter === null) {
      return
    }

    setSelectedWordValues([])
    setWordFilter(nextFilter)
  }
  const handleSelect = (word: LanguageLearningWord) => {
    setSelectedWordValues((values) => toggleLanguageLearningWordSelection(values, word.value))
  }
  const handleSave = () => {
    const values = wordsToSave()

    /* v8 ignore next -- The native disabled button prevents an empty save event. */
    if (values.length === 0) {
      return
    }

    try {
      appendLanguageLearningWords(language(), values)
      setPendingWords([])
      setInputValue('')
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to save language learning words.', error)
      setMessage(m.learning_words_save_failed())
    }
  }
  const handleDelete = (wordsToDelete: ReadonlyArray<LanguageLearningWord>) => {
    try {
      deleteLanguageLearningWords(
        language(),
        wordsToDelete.map((word) => word.value),
      )
      for (const word of wordsToDelete) {
        pronunciation.remove(word)
      }
      setSelectedWordValues([])
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to delete a language learning word.', error)
      setMessage(m.learning_words_delete_failed())
    }
  }
  const handleToggleMemorized = (wordsToChange: ReadonlyArray<LanguageLearningWord>) => {
    try {
      setLanguageLearningWordsMemorized({
        language: language(),
        memorized: !wordsToChange.every((word) => word.memorized),
        values: wordsToChange.map((word) => word.value),
      })
      setSelectedWordValues([])
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to update a language learning word.', error)
      setMessage(m.learning_words_update_failed())
    }
  }

  return (
    <section class="pomo-learning-words grid gap-4.5 settings-compact:gap-4">
      <LanguageLearningLanguageSelect
        class="w-full"
        onChange={handleLanguageChange}
        value={language()}
      />

      <LanguageLearningWordInputSection
        inputValue={inputValue()}
        onInputChange={setInputValue}
        onSave={handleSave}
        onTagsChange={setPendingWords}
        saveDisabled={wordsToSave().length === 0}
        tags={pendingWords()}
      />

      <LanguageLearningSavedWords
        allWords={filteredWords()}
        autoplayKey={pronunciation.autoplayKey}
        filter={wordFilter()}
        filterView={filterView()}
        getAudioUrl={pronunciation.audioUrl}
        isPronunciationLoading={pronunciation.isLoading}
        memorizedWords={memorizedWords()}
        onDelete={handleDelete}
        onFilterChange={handleWordFilterChange}
        onPronounce={pronunciation.request}
        onSelect={handleSelect}
        onToggleMemorized={handleToggleMemorized}
        pronunciationBusy={pronunciation.isBusy()}
        selectedWords={selectedWords}
        unmemorizedWords={unmemorizedWords()}
      />

      <Show when={message() ?? pronunciation.error()}>
        {(currentMessage) => (
          <p aria-live="polite" class="m-0 text-sm text-danger" role="status">
            {currentMessage()}
          </p>
        )}
      </Show>

      <PModelDownloadConsent
        actionLabel={m.learning_words_listen()}
        downloadSize={formatModelDownloadSize(
          getSupertonicModel(pronunciation.pendingModelId() ?? 'int8').size,
        )}
        isOpen={pronunciation.pendingWord() !== null}
        onCancel={pronunciation.cancelDownload}
        onConfirm={pronunciation.confirmDownload}
      />
    </section>
  )
}
