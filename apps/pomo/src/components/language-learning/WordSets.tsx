import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, Show} from 'solid-js'

import type {AppendLanguageLearningWordsResult} from 'src/features/language-learning'
import * as m from '@paraglide/message'
import {PSettingsEmptyState} from '../settings/EmptyState'

const CLASSES = {
  back: cx(
    'min-h-11 inline-flex items-center rounded-full border border-solid border-border',
    'px-4 text-foreground no-underline',
  ),
  page: 'min-h-dvh box-border bg-background p-[max(1.25rem,var(--pomo-safe-area-inset-top))] text-foreground',
  panel: 'grid gap-4 rounded-5 border border-solid border-border bg-surface p-5',
  set: cx(
    'flex min-h-16 items-center justify-between gap-3 rounded-control border',
    'border-solid border-border bg-surface-strong px-4 py-3',
  ),
  setAction: cx(
    'min-h-9 cursor-pointer rounded-full border border-solid border-border bg-transparent px-3',
    'text-sm font-700 text-foreground outline-none hover:bg-secondary-soft',
    'focus-visible:shadow-focus',
  ),
  setActions: 'flex shrink-0 items-center gap-2',
  setLanguage: cx(
    'shrink-0 rounded-full bg-secondary-soft px-2.5 py-1',
    'text-xs font-700 text-muted-foreground',
  ),
  tab: cx(
    'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-control',
    'border-0 bg-transparent px-4 text-sm font-700 text-muted-foreground outline-none',
    'transition-colors hover:bg-secondary-soft hover:text-foreground',
    'ui-selected:bg-surface-strong ui-selected:text-foreground focus-visible:shadow-focus',
    'motion-reduce:transition-none',
  ),
  tabList: cx(
    'grid grid-cols-2 gap-1 rounded-control bg-[rgb(255_255_255_/_5%)] p-1',
    'sm:grid-cols-4',
  ),
} as const

type LanguageLearningWordSetFilter = 'all' | 'en' | 'ja' | 'ko'
type LanguageLearningWordSetLanguage = Exclude<LanguageLearningWordSetFilter, 'all'>

export interface LanguageLearningWordSetSummary {
  readonly id: string
  readonly language: LanguageLearningWordSetLanguage
  readonly title: string
}

export interface LanguageLearningWordSetsProps {
  readonly onAddSet?: (setId: string) => AppendLanguageLearningWordsResult
  readonly sets?: ReadonlyArray<LanguageLearningWordSetSummary>
}

interface LanguageLearningWordSetLanguageOption {
  readonly label: string
  readonly language: LanguageLearningWordSetLanguage
}

const getLanguageLearningWordSetLanguageOptions =
  (): ReadonlyArray<LanguageLearningWordSetLanguageOption> => [
    {label: m.learning_word_sets_language_ko(), language: 'ko'},
    {label: m.learning_word_sets_language_en(), language: 'en'},
    {label: m.learning_word_sets_language_ja(), language: 'ja'},
  ]

const getLanguageLearningWordSetLanguageLabel = (
  language: LanguageLearningWordSetLanguage,
): string => {
  switch (language) {
    case 'ko':
      return m.learning_word_sets_language_ko()
    case 'en':
      return m.learning_word_sets_language_en()
    case 'ja':
      return m.learning_word_sets_language_ja()
  }
}

const parseLanguageLearningWordSetFilter = (
  value: string,
): LanguageLearningWordSetFilter | null => {
  switch (value) {
    case 'all':
    case 'ko':
    case 'en':
    case 'ja':
      return value
    default:
      return null
  }
}

const createWordSetAddedMessage = (
  title: string,
  result: AppendLanguageLearningWordsResult,
): string => {
  if (result.addedCount === 0) {
    return m.learning_word_sets_already_added({title})
  }

  if (result.skippedCount === 0) {
    return m.learning_word_sets_added({count: result.addedCount, title})
  }

  return m.learning_word_sets_added_with_duplicates({
    addedCount: result.addedCount,
    skippedCount: result.skippedCount,
    title,
  })
}

export const LanguageLearningWordSets = (props: LanguageLearningWordSetsProps) => {
  const [filter, setFilter] = createSignal<LanguageLearningWordSetFilter>('all')
  const [importMessage, setImportMessage] = createSignal('')
  const filteredSets = createMemo(() => {
    const currentFilter = filter()
    const availableSets = props.sets ?? []
    return currentFilter === 'all'
      ? availableSets
      : availableSets.filter((set) => set.language === currentFilter)
  })
  const handleFilterChange = (value: string) => {
    const nextFilter = parseLanguageLearningWordSetFilter(value)
    if (nextFilter !== null) {
      setFilter(nextFilter)
    }
  }
  const handleAddSet = (set: LanguageLearningWordSetSummary) => {
    try {
      const result = props.onAddSet?.(set.id)

      if (result !== undefined) {
        setImportMessage(createWordSetAddedMessage(set.title, result))
      }
    } catch (error: unknown) {
      console.error('Failed to add a language learning word set.', error)
      setImportMessage(m.learning_word_sets_add_failed({title: set.title}))
    }
  }

  return (
    <main class={CLASSES.page}>
      <div class="mx-auto grid w-full max-w-4xl gap-5">
        <header class="flex flex-wrap items-center justify-between gap-4">
          <h1 class="m-0 text-3xl">{m.learning_word_sets_title()}</h1>
          <A class={CLASSES.back} href="/">
            {m.learning_word_sets_back()}
          </A>
        </header>

        <section aria-labelledby="language-learning-word-sets-title" class={CLASSES.panel}>
          <div class="grid gap-1">
            <h2 class="m-0 text-xl" id="language-learning-word-sets-title">
              {m.learning_word_sets_catalog()}
            </h2>
            <p class="m-0 text-sm leading-6 text-muted-foreground">
              {m.learning_word_sets_description()}
            </p>
          </div>

          <Tabs class="grid gap-4" onChange={handleFilterChange} value={filter()}>
            <Tabs.List aria-label={m.learning_word_sets_filter_label()} class={CLASSES.tabList}>
              <Tabs.Trigger class={CLASSES.tab} value="all">
                {m.learning_word_sets_all()}
              </Tabs.Trigger>
              <For each={getLanguageLearningWordSetLanguageOptions()}>
                {(option) => (
                  <Tabs.Trigger class={CLASSES.tab} value={option.language}>
                    {option.label}
                  </Tabs.Trigger>
                )}
              </For>
            </Tabs.List>

            <Tabs.Content value={filter()}>
              <Show
                fallback={<PSettingsEmptyState>{m.learning_word_sets_empty()}</PSettingsEmptyState>}
                when={filteredSets().length > 0}
              >
                <ul
                  aria-label={m.learning_word_sets_catalog()}
                  class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2"
                >
                  <For each={filteredSets()}>
                    {(set) => (
                      <li class={CLASSES.set}>
                        <span class="min-w-0 text-base font-700">{set.title}</span>
                        <div class={CLASSES.setActions}>
                          <span class={CLASSES.setLanguage}>
                            {getLanguageLearningWordSetLanguageLabel(set.language)}
                          </span>
                          <Show when={props.onAddSet}>
                            <button
                              aria-label={m.learning_word_sets_add_label({title: set.title})}
                              class={CLASSES.setAction}
                              onClick={() => handleAddSet(set)}
                              type="button"
                            >
                              {m.learning_word_sets_add()}
                            </button>
                          </Show>
                        </div>
                      </li>
                    )}
                  </For>
                </ul>
                <p
                  aria-label={importMessage()}
                  aria-live="polite"
                  class="m-0 min-h-5 text-sm text-muted-foreground"
                  role="status"
                >
                  {importMessage()}
                </p>
              </Show>
            </Tabs.Content>
          </Tabs>
        </section>
      </div>
    </main>
  )
}
