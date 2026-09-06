import {cva, cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {type LanguageLearningWord} from '../../../features/language-learning'
import {PSettingsEmptyState} from '../../settings/EmptyState'
import {LanguageLearningWordPronunciationButton} from './PronunciationButton'
import {LanguageLearningWordActions} from './Actions'

const wordClasses = cva(
  'inline-flex min-h-7 max-w-full items-stretch overflow-hidden rounded-control border border-solid',
  {
    defaultVariants: {selected: false},
    variants: {
      selected: {
        false: 'border-border bg-content-surface hover:border-border-hover hover:bg-secondary-soft',
        true: 'border-primary bg-primary-soft',
      },
    },
  },
)

const WORD_SELECT_BUTTON_CLASS = cx(
  'flex min-w-0 flex-1 cursor-pointer items-center break-words border-0 bg-transparent',
  'px-2.5 py-1 text-left text-sm font-650 text-foreground outline-none focus-visible:shadow-focus',
)

interface LanguageLearningWordListProps {
  readonly autoplayKey: () => string | null
  readonly pronunciationBusy: boolean
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

export const LanguageLearningWordList = (props: LanguageLearningWordListProps) => (
  <div class="grid gap-2">
    <Show
      when={props.words.length > 0}
      fallback={<PSettingsEmptyState>{props.emptyMessage}</PSettingsEmptyState>}
    >
      <ul
        class={
          'm-0 flex max-h-[19rem] list-none content-start items-start gap-2 overflow-y-auto ' +
          'p-0 pr-1 flex-wrap ' +
          '[scrollbar-color:var(--pomo-color-modal-scrollbar)_transparent] [scrollbar-width:thin]'
        }
      >
        <For each={props.words}>
          {(word) => {
            const audioUrl = () => props.getAudioUrl(word)
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
                  disabled={props.pronunciationBusy && audioUrl() === null}
                  loading={props.isPronunciationLoading(word)}
                  onPress={() => props.onPronounce(word)}
                  src={audioUrl()}
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
