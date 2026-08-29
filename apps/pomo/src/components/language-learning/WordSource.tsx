import {Show} from 'solid-js'

import * as m from '@paraglide/message'
import {
  type LanguageLearningWordSource,
  MAXIMUM_DIRECT_LANGUAGE_LEARNING_WORDS,
  MAXIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
  MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
} from '../../features/language-learning'
import {PRadioSwitch} from '../PRadioSwitch'
import {LanguageLearningTagInput} from './TagInput'

const getWordSourceOptions = (savedWordsAvailable: boolean) =>
  [
    {label: m.learning_editor_word_source_direct(), value: 'direct'},
    {
      disabled: !savedWordsAvailable,
      label: m.learning_editor_word_source_saved(),
      value: 'saved',
    },
  ] satisfies ReadonlyArray<{
    readonly disabled?: boolean
    readonly label: string
    readonly value: LanguageLearningWordSource
  }>

export interface LanguageLearningWordSourceControlProps {
  readonly disabled?: boolean
  readonly inputValue: string
  readonly onInputChange: (value: string) => void
  readonly onSourceChange: (source: LanguageLearningWordSource) => void
  readonly onWordsChange: (words: ReadonlyArray<string>) => void
  readonly savedWordCount: number
  readonly source: LanguageLearningWordSource
  readonly words: ReadonlyArray<string>
}

export const LanguageLearningWordSourceControl = (
  props: LanguageLearningWordSourceControlProps,
) => {
  const hasEnoughSavedWords = () => props.savedWordCount >= MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS
  const maximumSavedWords = () =>
    Math.min(props.savedWordCount, MAXIMUM_RANDOM_LANGUAGE_LEARNING_WORDS)

  return (
    <div class="grid gap-4">
      <PRadioSwitch
        disabled={props.disabled}
        label={m.learning_editor_word_source()}
        onChange={props.onSourceChange}
        options={getWordSourceOptions(hasEnoughSavedWords())}
        value={props.source}
      />

      <Show
        when={props.source === 'direct'}
        fallback={
          <div class="grid gap-2 rounded-panel border border-solid border-border bg-[rgb(255_255_255_/_3%)] p-4">
            <Show
              when={hasEnoughSavedWords()}
              fallback={
                <p class="m-0 text-sm leading-6 text-danger">
                  {m.learning_editor_saved_words_insufficient({
                    minimum: MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
                  })}
                </p>
              }
            >
              <p class="m-0 text-sm leading-6 text-foreground">
                {m.learning_editor_saved_words_hint({
                  count: props.savedWordCount,
                  maximum: maximumSavedWords(),
                  minimum: MINIMUM_RANDOM_LANGUAGE_LEARNING_WORDS,
                })}
              </p>
            </Show>
            <Show when={props.words.length > 0}>
              <p class="m-0 text-xs leading-5 text-muted-foreground">
                {m.learning_editor_selected_words({words: props.words.join(', ')})}
              </p>
            </Show>
          </div>
        }
      >
        <LanguageLearningTagInput
          description={m.learning_editor_tags_hint()}
          disabled={props.disabled}
          inputValue={props.inputValue}
          maximumTags={MAXIMUM_DIRECT_LANGUAGE_LEARNING_WORDS}
          onInputChange={props.onInputChange}
          onTagsChange={props.onWordsChange}
          tags={props.words}
        />
      </Show>
    </div>
  )
}
