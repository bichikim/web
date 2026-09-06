import {Tabs} from '@kobalte/core/tabs'
import {cx} from 'class-variance-authority'
import * as m from '@paraglide/message'
import {type LanguageLearningWord} from '../../../features/language-learning'
import {PSettingsActionLink} from '../../settings/ActionLink'
import {PSettingsSectionHeading} from '../../settings/SectionHeading'
import {type LanguageLearningWordFilter, type LanguageLearningWordFilterView} from './filter'
import {LanguageLearningWordList} from './List'

const WORD_FILTER_LIST_CLASS =
  'grid grid-cols-3 gap-1 rounded-control bg-[rgb(255_255_255_/_5%)] p-1'

const WORD_FILTER_TAB_CLASS = cx(
  'inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control',
  'border-0 bg-transparent px-2 text-modal-detail font-700 text-muted-foreground outline-none',
  'transition-colors hover:bg-secondary-soft hover:text-foreground',
  'ui-selected:bg-surface-strong ui-selected:text-foreground focus-visible:shadow-focus',
  'motion-reduce:transition-none',
)

const WORD_FILTER_COUNT_CLASS = 'text-modal-detail font-650 tabular-nums opacity-70'

interface LanguageLearningSavedWordsProps {
  readonly allWords: ReadonlyArray<LanguageLearningWord>
  readonly autoplayKey: () => string | null
  readonly filter: LanguageLearningWordFilter
  readonly filterView: LanguageLearningWordFilterView
  readonly getAudioUrl: (word: LanguageLearningWord) => string | null
  readonly isPronunciationLoading: (word: LanguageLearningWord) => boolean
  readonly memorizedWords: ReadonlyArray<LanguageLearningWord>
  readonly pronunciationBusy: boolean
  readonly onDelete: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly onFilterChange: (value: string) => void
  readonly onPronounce: (word: LanguageLearningWord) => void
  readonly onSelect: (word: LanguageLearningWord) => void
  readonly onToggleMemorized: (words: ReadonlyArray<LanguageLearningWord>) => void
  readonly selectedWords: () => ReadonlyArray<LanguageLearningWord>
  readonly unmemorizedWords: ReadonlyArray<LanguageLearningWord>
}

export const LanguageLearningSavedWords = (props: LanguageLearningSavedWordsProps) => (
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
          pronunciationBusy={props.pronunciationBusy}
          selectedWords={props.selectedWords}
          words={props.filterView.words}
        />
      </Tabs.Content>
    </Tabs>
  </>
)
