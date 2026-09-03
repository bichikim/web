import {cva, cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {
  appendLanguageLearningWords,
  deleteLanguageLearningWord,
  type LanguageLearningLanguage,
  type LanguageLearningWord,
  parseLanguageLearningTags,
  setLanguageLearningWordMemorized,
  useLanguageLearningWords,
} from '../../features/language-learning'
import {PButton} from '../PButton'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'
import {LanguageLearningLanguageSelect} from './LanguageSelect'
import {LanguageLearningTagInput} from './TagInput'

const WORD_CLASS = cx(
  'inline-flex min-h-9 max-w-full items-stretch overflow-hidden rounded-control border border-solid',
  'border-border bg-[rgb(255_255_255_/_3%)]',
)
const WORD_ACTION_BUTTON_CLASS = cx(
  'inline-flex size-9 flex-none cursor-pointer items-center justify-center border-0',
  'border-solid border-border bg-transparent',
)
const memorizedButtonClasses = cva(`${WORD_ACTION_BUTTON_CLASS} border-r`, {
  defaultVariants: {memorized: false},
  variants: {
    memorized: {
      false: 'text-muted-foreground hover:text-foreground',
      true: 'bg-primary-soft text-primary hover:text-foreground',
    },
  },
})

interface LanguageLearningWordListProps {
  readonly emptyMessage: string
  readonly onDelete: (value: string) => void
  readonly onToggleMemorized: (word: LanguageLearningWord) => void
  readonly title: string
  readonly words: ReadonlyArray<LanguageLearningWord>
}

const LanguageLearningWordList = (props: LanguageLearningWordListProps) => (
  <>
    <PSettingsSectionHeading count={`${props.words.length}개`} title={props.title} />

    <Show
      when={props.words.length > 0}
      fallback={<PSettingsEmptyState>{props.emptyMessage}</PSettingsEmptyState>}
    >
      <ul
        class={
          'm-0 flex max-h-[19rem] list-none content-start items-start gap-2 overflow-y-auto ' +
          'overscroll-contain p-0 pr-1 flex-wrap ' +
          '[scrollbar-color:rgb(255_250_241_/_24%)_transparent] [scrollbar-width:thin]'
        }
      >
        <For each={props.words}>
          {(word) => {
            const toggleLabel = () =>
              word.memorized
                ? m.learning_words_unmark_memorized({word: word.value})
                : m.learning_words_mark_memorized({word: word.value})

            return (
              <li class={WORD_CLASS}>
                <button
                  aria-label={toggleLabel()}
                  aria-pressed={word.memorized}
                  class={memorizedButtonClasses({memorized: word.memorized})}
                  onClick={() => props.onToggleMemorized(word)}
                  type="button"
                >
                  <span aria-hidden="true" class="i-tabler-check size-3.5" />
                </button>
                <span class="min-w-0 flex-1 break-words px-2.5 py-2 text-xs font-650 text-foreground">
                  {word.value}
                </span>
                <button
                  aria-label={m.learning_words_remove({word: word.value})}
                  class={`${WORD_ACTION_BUTTON_CLASS} border-l text-muted-foreground hover:text-foreground`}
                  onClick={() => props.onDelete(word.value)}
                  type="button"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            )
          }}
        </For>
      </ul>
    </Show>
  </>
)

export const LanguageLearningWords = () => {
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const [inputValue, setInputValue] = createSignal('')
  const [pendingWords, setPendingWords] = createSignal<ReadonlyArray<string>>([])
  const [message, setMessage] = createSignal<string | null>(null)
  const words = useLanguageLearningWords()
  const filteredWords = createMemo(() => words().filter((word) => word.language === language()))
  const savedWords = createMemo(() => filteredWords().filter((word) => !word.memorized))
  const memorizedWords = createMemo(() => filteredWords().filter((word) => word.memorized))
  const wordsToSave = () => parseLanguageLearningTags([...pendingWords(), inputValue()].join(','))

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

  const handleDelete = (value: string) => {
    try {
      deleteLanguageLearningWord(language(), value)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to delete a language learning word.', error)
      setMessage(m.learning_words_delete_failed())
    }
  }

  const handleToggleMemorized = (word: LanguageLearningWord) => {
    try {
      setLanguageLearningWordMemorized({
        language: word.language,
        memorized: !word.memorized,
        value: word.value,
      })
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to update a language learning word.', error)
      setMessage(m.learning_words_update_failed())
    }
  }

  return (
    <section class="pomo-learning-words grid gap-4.5 settings-compact:gap-4">
      <LanguageLearningLanguageSelect class="w-full" onChange={setLanguage} value={language()} />

      <div class="grid gap-3 rounded-panel border border-solid border-border bg-[rgb(255_255_255_/_3%)] p-4">
        <LanguageLearningTagInput
          description={m.learning_words_input_hint()}
          getRemoveLabel={(word) => m.learning_words_remove({word})}
          inputValue={inputValue()}
          label={m.learning_words_input()}
          onInputChange={setInputValue}
          onTagsChange={setPendingWords}
          placeholder={m.learning_words_input_placeholder()}
          tags={pendingWords()}
        />
        <PButton class="w-full" disabled={wordsToSave().length === 0} onPress={handleSave}>
          {m.learning_words_save()}
        </PButton>
      </div>

      <LanguageLearningWordList
        emptyMessage={m.learning_words_empty()}
        onDelete={handleDelete}
        onToggleMemorized={handleToggleMemorized}
        title={m.learning_words_saved()}
        words={savedWords()}
      />

      <LanguageLearningWordList
        emptyMessage={m.learning_words_memorized_empty()}
        onDelete={handleDelete}
        onToggleMemorized={handleToggleMemorized}
        title={m.learning_words_memorized()}
        words={memorizedWords()}
      />

      <Show when={message()}>
        {(currentMessage) => (
          <p aria-live="polite" class="m-0 text-sm text-[#f2a398]" role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </section>
  )
}
