import {Tabs} from '@kobalte/core/tabs'
import {cva, cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, For, onCleanup, Show, untrack} from 'solid-js'

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
import {PButton} from '../PButton'
import {PModelDownloadConsent} from '../PModelDownloadConsent'
import {PSettingsActionLink} from '../settings/ActionLink'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {LanguageLearningLanguageSelect} from './LanguageSelect'
import {LanguageLearningTagInput} from './TagInput'
import {useLanguageLearningWordPronunciation} from './use-word-pronunciation'

const wordClasses = cva(
  'inline-flex min-h-7 max-w-full items-stretch overflow-hidden rounded-control border border-solid',
  {
    defaultVariants: {selected: false},
    variants: {
      selected: {
        false:
          'border-border bg-[rgb(255_255_255_/_3%)] hover:border-border-hover hover:bg-secondary-soft',
        true: 'border-primary bg-primary-soft',
      },
    },
  },
)
const WORD_ACTION_BUTTON_CLASS = cx(
  'inline-flex min-h-7 w-9 flex-none cursor-pointer self-stretch items-center justify-center border-0',
  'border-solid border-border bg-transparent',
)
const WORD_SELECT_BUTTON_CLASS = cx(
  'flex min-w-0 flex-1 cursor-pointer items-center break-words border-0 bg-transparent',
  'px-2.5 py-1 text-left text-sm font-650 text-foreground outline-none focus-visible:shadow-focus',
)
const WORD_FILTER_LIST_CLASS =
  'grid grid-cols-3 gap-1 rounded-control bg-[rgb(255_255_255_/_5%)] p-1'
const WORD_FILTER_TAB_CLASS = cx(
  'inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control',
  'border-0 bg-transparent px-2 text-xs font-700 text-muted-foreground outline-none',
  'transition-colors hover:bg-secondary-soft hover:text-foreground',
  'ui-selected:bg-surface-strong ui-selected:text-foreground focus-visible:shadow-focus',
  'motion-reduce:transition-none',
)
const WORD_FILTER_COUNT_CLASS = 'text-[0.6875rem] font-650 tabular-nums opacity-70'
type LanguageLearningWordFilter = 'all' | 'memorized' | 'unmemorized'

interface LanguageLearningWordFilterView {
  readonly emptyMessage: string
  readonly words: ReadonlyArray<LanguageLearningWord>
}

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

interface LanguageLearningWordListProps {
  readonly autoplayKey: () => string | null
  readonly getAudioUrl: (word: LanguageLearningWord) => string | null
  readonly emptyMessage: string
  readonly isPronunciationLoading: (word: LanguageLearningWord) => boolean
  readonly onDelete: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly onPronounce: (word: LanguageLearningWord) => void
  readonly onSelect: (word: LanguageLearningWord) => void
  readonly onToggleMemorized: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly selectedWords: () => ReadonlyArray<LanguageLearningWord>
  readonly words: ReadonlyArray<LanguageLearningWord>
}

interface LanguageLearningWordPronunciationButtonProps {
  readonly autoplay: boolean
  readonly loading: boolean
  readonly onPress: () => void
  readonly src: string | null
  readonly word: string
}

interface LanguageLearningWordActionsProps {
  readonly onDelete: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly onToggleMemorized: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly selectedWords: ReadonlyArray<LanguageLearningWord>
}

interface LanguageLearningWordInputSectionProps {
  readonly inputValue: string
  readonly onInputChange: (value: string) => void
  readonly onSave: () => void
  readonly onTagsChange: (values: ReadonlyArray<string>) => void
  readonly saveDisabled: boolean
  readonly tags: ReadonlyArray<string>
}

const LanguageLearningWordInputSection = (props: LanguageLearningWordInputSectionProps) => (
  <div class="grid gap-3 rounded-panel border border-solid border-border bg-[rgb(255_255_255_/_3%)] p-4">
    <LanguageLearningTagInput
      description={m.learning_words_input_hint()}
      getRemoveLabel={(word) => m.learning_words_remove({word})}
      inputValue={props.inputValue}
      label={m.learning_words_input()}
      onInputChange={props.onInputChange}
      onTagsChange={props.onTagsChange}
      placeholder={m.learning_words_input_placeholder()}
      tags={props.tags}
    />
    <PButton class="w-full" disabled={props.saveDisabled} onPress={props.onSave}>
      {m.learning_words_save()}
    </PButton>
  </div>
)

const LanguageLearningWordActions = (props: LanguageLearningWordActionsProps) => {
  const selectedCount = () => props.selectedWords.length
  const allMemorized = () =>
    props.selectedWords.length > 0 && props.selectedWords.every((word) => word.memorized)
  const toggleLabel = () =>
    allMemorized()
      ? m.learning_words_unmark_selected({count: selectedCount()})
      : m.learning_words_mark_selected({count: selectedCount()})

  return (
    <div class="flex flex-wrap items-center gap-2" role="group">
      <span class="mr-auto text-xs font-650 text-muted-foreground">
        {m.learning_words_selection_count({count: selectedCount()})}
      </span>
      <PButton
        accessibleLabel={toggleLabel()}
        disabled={selectedCount() === 0}
        icon="i-tabler-check"
        onPress={() => props.onToggleMemorized(props.selectedWords)}
        size="small"
        tone="secondary"
      >
        {allMemorized() ? m.learning_words_unmark_action() : m.learning_words_mark_action()}
      </PButton>
      <PButton
        accessibleLabel={m.learning_words_delete_selected({count: selectedCount()})}
        disabled={selectedCount() === 0}
        icon="i-tabler-trash"
        onPress={() => props.onDelete(props.selectedWords)}
        size="small"
        tone="danger"
      >
        {m.learning_words_delete_action()}
      </PButton>
    </div>
  )
}

const LanguageLearningWordPronunciationButton = (
  props: LanguageLearningWordPronunciationButtonProps,
) => {
  const [audio, setAudio] = createSignal<HTMLAudioElement>()

  const play = () => {
    const element = audio()
    if (element === undefined) {
      return
    }

    element.currentTime = 0
    element.play().catch(() => undefined)
  }

  createEffect(() => {
    const shouldAutoplay = props.autoplay
    if (shouldAutoplay && untrack(() => props.src) !== null) {
      play()
    }
  })

  onCleanup(() => audio()?.pause())

  return (
    <>
      <button
        aria-busy={props.loading}
        aria-label={
          props.loading
            ? m.learning_words_pronouncing({word: props.word})
            : m.learning_words_pronounce({word: props.word})
        }
        class={`${WORD_ACTION_BUTTON_CLASS} border-l text-muted-foreground hover:text-foreground`}
        disabled={props.loading}
        onClick={() => props.onPress()}
        title={m.learning_words_pronounce({word: props.word})}
        type="button"
      >
        <span
          aria-hidden="true"
          class={
            props.loading ? 'i-tabler-loader-2 size-3.5 animate-spin' : 'i-tabler-volume-2 size-3.5'
          }
        />
      </button>
      <audio
        aria-hidden="true"
        class="hidden"
        preload="auto"
        ref={setAudio}
        src={props.src ?? undefined}
      />
    </>
  )
}

const LanguageLearningWordList = (props: LanguageLearningWordListProps) => (
  <div class="grid gap-2">
    <Show
      when={props.words.length > 0}
      fallback={<PSettingsEmptyState>{props.emptyMessage}</PSettingsEmptyState>}
    >
      <ul
        class={
          'm-0 flex max-h-[19rem] list-none content-start items-start gap-2 overflow-y-auto ' +
          'p-0 pr-1 flex-wrap ' +
          '[scrollbar-color:rgb(255_250_241_/_24%)_transparent] [scrollbar-width:thin]'
        }
      >
        <For each={props.words}>
          {(word) => {
            const selected = () =>
              props.selectedWords().some((selectedWord) => selectedWord.value === word.value)

            return (
              <li class={wordClasses({selected: selected()})}>
                <button
                  aria-label={word.value}
                  aria-pressed={selected()}
                  class={WORD_SELECT_BUTTON_CLASS}
                  onClick={() => props.onSelect(word)}
                  type="button"
                >
                  {word.value}
                </button>
                <LanguageLearningWordPronunciationButton
                  autoplay={props.autoplayKey() === `${word.language}:${word.value}`}
                  loading={props.isPronunciationLoading(word)}
                  onPress={() => props.onPronounce(word)}
                  src={props.getAudioUrl(word)}
                  word={word.value}
                />
              </li>
            )
          }}
        </For>
      </ul>
    </Show>

    <LanguageLearningWordActions
      onDelete={props.onDelete}
      onToggleMemorized={props.onToggleMemorized}
      selectedWords={props.selectedWords()}
    />
  </div>
)

interface LanguageLearningSavedWordsProps {
  readonly allWords: ReadonlyArray<LanguageLearningWord>
  readonly autoplayKey: () => string | null
  readonly filter: LanguageLearningWordFilter
  readonly filterView: LanguageLearningWordFilterView
  readonly getAudioUrl: (word: LanguageLearningWord) => string | null
  readonly isPronunciationLoading: (word: LanguageLearningWord) => boolean
  readonly memorizedWords: ReadonlyArray<LanguageLearningWord>
  readonly onDelete: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly onFilterChange: (value: string) => void
  readonly onPronounce: (word: LanguageLearningWord) => void
  readonly onSelect: (word: LanguageLearningWord) => void
  readonly onToggleMemorized: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly selectedWords: () => ReadonlyArray<LanguageLearningWord>
  readonly unmemorizedWords: ReadonlyArray<LanguageLearningWord>
}

const LanguageLearningSavedWords = (props: LanguageLearningSavedWordsProps) => (
  <>
    <PSettingsSectionHeading
      actions={
        <PSettingsActionLink
          class="ml-auto"
          href="/language-learning/word-sets"
          icon="i-tabler-library-plus"
        >
          {m.learning_word_sets_open()}
        </PSettingsActionLink>
      }
      count={m.settings_count({count: props.allWords.length})}
      title={m.learning_words_saved()}
    />
    <Tabs class="grid gap-3" onChange={props.onFilterChange} value={props.filter}>
      <Tabs.List aria-label={m.learning_words_filter_label()} class={WORD_FILTER_LIST_CLASS}>
        <Tabs.Trigger class={WORD_FILTER_TAB_CLASS} value="all">
          <span>{m.learning_words_all()}</span>
          <span class={WORD_FILTER_COUNT_CLASS}>{props.allWords.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={WORD_FILTER_TAB_CLASS} value="unmemorized">
          <span>{m.learning_words_unmemorized()}</span>
          <span class={WORD_FILTER_COUNT_CLASS}>{props.unmemorizedWords.length}</span>
        </Tabs.Trigger>
        <Tabs.Trigger class={WORD_FILTER_TAB_CLASS} value="memorized">
          <span>{m.learning_words_memorized()}</span>
          <span class={WORD_FILTER_COUNT_CLASS}>{props.memorizedWords.length}</span>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value={props.filter}>
        <LanguageLearningWordList
          autoplayKey={props.autoplayKey}
          getAudioUrl={props.getAudioUrl}
          emptyMessage={props.filterView.emptyMessage}
          isPronunciationLoading={props.isPronunciationLoading}
          onDelete={props.onDelete}
          onPronounce={props.onPronounce}
          onSelect={props.onSelect}
          onToggleMemorized={props.onToggleMemorized}
          selectedWords={props.selectedWords}
          words={props.filterView.words}
        />
      </Tabs.Content>
    </Tabs>
  </>
)

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
        selectedWords={selectedWords}
        unmemorizedWords={unmemorizedWords()}
      />

      <Show when={message() ?? pronunciation.error()}>
        {(currentMessage) => (
          <p aria-live="polite" class="m-0 text-sm text-[#f2a398]" role="status">
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
