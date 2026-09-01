import {cx} from 'class-variance-authority'
import {TextField} from '@kobalte/core/text-field'
import {createSignal, For} from 'solid-js'

import * as m from '@paraglide/message'
import {
  MAXIMUM_LANGUAGE_LEARNING_TAGS,
  parseLanguageLearningTags,
} from '../../features/language-learning'

const CONTROL_CLASS = cx(
  'flex min-h-control-md cursor-text flex-wrap items-center gap-2 rounded-control border border-solid',
  'border-border bg-surface px-2 py-2 backdrop-blur-surface',
  'transition-[border-color_160ms_ease,background-color_160ms_ease]',
  'hover:border-border-hover focus-within:border-highlight motion-reduce:transition-none',
)
const TAG_CLASS = cx(
  'min-h-8 cursor-pointer rounded-3 border border-solid border-border bg-secondary-soft px-3',
  'text-sm font-650 text-foreground hover:border-border-hover hover:bg-surface-interactive',
  'disabled:cursor-not-allowed disabled:opacity-40',
)
const INPUT_CLASS = cx(
  'min-h-8 min-w-32 flex-1 border-0 bg-transparent px-2 text-sm font-650 text-foreground',
  'outline-none placeholder:font-500 placeholder:text-muted-foreground',
)

export interface LanguageLearningTagInputProps {
  readonly description?: string
  readonly disabled?: boolean
  readonly getRemoveLabel?: (tag: string) => string
  readonly inputValue: string
  readonly label?: string
  readonly maximumTags?: number
  readonly onInputChange: (value: string) => void
  readonly onTagsChange: (tags: ReadonlyArray<string>) => void
  readonly placeholder?: string
  readonly tags: ReadonlyArray<string>
}

export const LanguageLearningTagInput = (props: LanguageLearningTagInputProps) => {
  const [inputElement, setInputElement] = createSignal<HTMLInputElement>()
  const [isComposing, setIsComposing] = createSignal(false)
  const maximumTags = () =>
    Math.min(props.maximumTags ?? MAXIMUM_LANGUAGE_LEARNING_TAGS, MAXIMUM_LANGUAGE_LEARNING_TAGS)

  const commitInput = (input: string) => {
    const nextTags = parseLanguageLearningTags([...props.tags, input].join(',')).slice(
      0,
      maximumTags(),
    )
    props.onTagsChange(nextTags)
    props.onInputChange('')
  }

  const handleInputChange = (value: string) => {
    if (!isComposing() && /[,\n]/u.test(value)) {
      commitInput(value)
      return
    }

    props.onInputChange(value)
  }

  const handlePaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text') ?? ''

    if (!/[,\n]/u.test(pasted)) {
      return
    }

    event.preventDefault()
    commitInput([props.inputValue, pasted].filter(Boolean).join(','))
  }

  return (
    <TextField
      class="grid gap-1.5"
      disabled={props.disabled}
      onChange={handleInputChange}
      value={props.inputValue}
    >
      <TextField.Label class="text-xs font-650 leading-4 text-muted-foreground">
        {props.label ?? m.learning_editor_tags()}
      </TextField.Label>
      <div
        class={CONTROL_CLASS}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            inputElement()?.focus()
          }
        }}
      >
        <For each={props.tags}>
          {(tag) => (
            <button
              aria-label={props.getRemoveLabel?.(tag) ?? m.learning_editor_remove_tag({tag})}
              class={TAG_CLASS}
              disabled={props.disabled}
              onClick={() => props.onTagsChange(props.tags.filter((item) => item !== tag))}
              type="button"
            >
              {tag} <span aria-hidden="true">×</span>
            </button>
          )}
        </For>
        <TextField.Input
          class={INPUT_CLASS}
          disabled={props.disabled || props.tags.length >= maximumTags()}
          maxlength="300"
          onBlur={() => commitInput(props.inputValue)}
          onCompositionEnd={() => setIsComposing(false)}
          onCompositionStart={() => setIsComposing(true)}
          onKeyDown={(event) => {
            if (event.isComposing || isComposing()) {
              return
            }

            if (event.key === ',' || event.key === 'Enter') {
              event.preventDefault()
              commitInput(props.inputValue)
            } else if (
              event.key === 'Backspace' &&
              props.inputValue.length === 0 &&
              props.tags.length > 0
            ) {
              props.onTagsChange(props.tags.slice(0, -1))
            }
          }}
          onPaste={handlePaste}
          placeholder={props.placeholder ?? m.learning_editor_tags_placeholder()}
          ref={setInputElement}
        />
      </div>
      <TextField.Description class="text-xs font-400 leading-5 text-muted-foreground">
        {props.description ?? m.learning_editor_tags_hint()}
      </TextField.Description>
    </TextField>
  )
}
