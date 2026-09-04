import {useEvent} from '@winter-love/solid-use'
import {cx} from 'class-variance-authority'
import {type Accessor, createEffect, createSignal, type Setter, Show} from 'solid-js'

import * as m from '@paraglide/message'

export interface PDialogueComposerProps {
  readonly autoExpand?: boolean
  readonly disabled?: boolean
  readonly loading?: boolean
  readonly onSubmit?: (text: string) => boolean | Promise<boolean> | Promise<void> | void
}

const focusMountedInput = (element: HTMLInputElement | undefined) => {
  queueMicrotask(() => element?.focus())
}

const containsFocusTarget = (element: HTMLElement | undefined, target: EventTarget | null) =>
  target instanceof Node && element?.contains(target) === true

interface UseAutoExpandOptions {
  readonly autoExpand: Accessor<boolean>
  readonly input: Accessor<HTMLInputElement | undefined>
  readonly isEmpty: Accessor<boolean>
  readonly setExpanded: Setter<boolean>
}

const useAutoExpand = (options: UseAutoExpandOptions) => {
  let isAvailable = true
  let wasAutoExpanded = false

  createEffect(() => {
    if (!options.autoExpand()) {
      isAvailable = true
      if (
        wasAutoExpanded &&
        options.isEmpty() &&
        options.input()?.ownerDocument.activeElement !== options.input()
      ) {
        wasAutoExpanded = false
        options.setExpanded(false)
      }
      return
    }

    if (isAvailable) {
      isAvailable = false
      wasAutoExpanded = true
      options.setExpanded(true)
    }
  })
}

const COMPOSER_CLASSES = cx(
  'pomo-dialogue-composer grid size-13 self-end grid-cols-[1fr] sm:self-start',
  'box-border items-center overflow-hidden rounded-full border border-solid border-border',
  'bg-surface backdrop-blur-surface outline-none',
  'transition-[width_180ms_ease,background-color_160ms_ease,border-color_160ms_ease]',
  '[&[data-expanded]]:min-w-0 [&[data-expanded]]:max-w-full [&[data-expanded]]:w-full',
  '[&[data-expanded]]:[flex:none] [&[data-expanded]]:self-start',
  '[&[data-expanded]]:grid-cols-[minmax(0,_1fr)_auto]',
  'focus-within:border-highlight focus-within:bg-surface-interactive',
  'motion-reduce:transition-none',
)

const TRIGGER_CLASSES = cx(
  'grid size-full cursor-pointer place-items-center border-0 bg-transparent',
  'text-highlight outline-none hover:bg-surface-interactive disabled:cursor-not-allowed',
)

const SUBMIT_CLASSES = cx(
  'm-2 grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0',
  'bg-highlight text-[#241a12] outline-none transition-transform duration-160',
  'hover:-translate-y-0.5 focus-visible:shadow-focus disabled:cursor-not-allowed',
  'disabled:opacity-45 disabled:transform-none motion-reduce:transition-none',
)

interface DialogueTriggerProps {
  readonly disabled: boolean
  readonly loading: boolean
  readonly onClick: () => void
  readonly onMount: (element: HTMLButtonElement) => void
}

const DialogueTrigger = (props: DialogueTriggerProps) => (
  <button
    aria-expanded="false"
    aria-label={
      props.loading ? m.dialogue_composer_preparing_label() : m.dialogue_composer_start_label()
    }
    class={TRIGGER_CLASSES}
    disabled={props.disabled}
    onClick={() => props.onClick()}
    ref={props.onMount}
    type="button"
  >
    <Show
      when={props.loading}
      fallback={<span aria-hidden="true" class="i-tabler-message-circle size-6" />}
    >
      <span
        aria-hidden="true"
        class="i-tabler-loader-2 size-6 animate-spin motion-reduce:animate-none"
      />
    </Show>
  </button>
)

export const PDialogueComposer = (props: PDialogueComposerProps) => {
  const [draft, setDraft] = createSignal('')
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [composer, setComposer] = createSignal<HTMLFormElement>()
  const [input, setInput] = createSignal<HTMLInputElement>()
  let focusInputAfterMount = false
  let restoreTriggerFocus = false
  useAutoExpand({
    autoExpand: () => Boolean(props.autoExpand),
    input,
    isEmpty: () => draft().length === 0,
    setExpanded: setIsExpanded,
  })
  const isDisabled = () => Boolean(props.disabled || props.loading)
  const canSubmit = () => draft().trim().length > 0
  const expand = () => {
    if (isDisabled()) {
      return
    }

    focusInputAfterMount = true
    setIsExpanded(true)
  }
  const collapse = () => {
    focusInputAfterMount = false
    restoreTriggerFocus = true
    setIsExpanded(false)
  }
  const handleTriggerMount = (element: HTMLButtonElement) => {
    if (restoreTriggerFocus) {
      restoreTriggerFocus = false
      element.focus()
    }
  }
  const handleInput = (event: InputEvent & {currentTarget: HTMLInputElement}) => {
    setDraft(event.currentTarget.value)
  }
  const handleInputMount = (element: HTMLInputElement) => {
    setInput(element)
    if (focusInputAfterMount) {
      focusInputAfterMount = false
      focusMountedInput(element)
    }
  }
  const handleOutsidePointer = (event: PointerEvent) => {
    const composerElement = composer()
    const eventTarget = event.target

    if (
      !isExpanded() ||
      composerElement === undefined ||
      !(eventTarget instanceof Node) ||
      composerElement.contains(eventTarget)
    ) {
      return
    }

    input()?.blur()
  }
  const handleInputBlur = (event: FocusEvent & {currentTarget: HTMLInputElement}) => {
    if (props.autoExpand || props.loading || containsFocusTarget(composer(), event.relatedTarget)) {
      return
    }

    if (draft().length === 0) {
      setIsExpanded(false)
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      collapse()
    }
  }
  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    const submittedDraft = draft()
    const text = draft().trim()

    if (text.length === 0 || isDisabled() || props.onSubmit === undefined) {
      return
    }

    const result = await props.onSubmit(text)

    if (result === false) {
      focusMountedInput(input())
      return
    }

    setDraft((currentDraft) => (currentDraft === submittedDraft ? '' : currentDraft))
    focusMountedInput(input())
  }

  useEvent(() => composer()?.ownerDocument, 'pointerdown', handleOutsidePointer)

  return (
    <form
      aria-busy={props.loading ? 'true' : undefined}
      data-expanded={isExpanded() ? '' : undefined}
      class={COMPOSER_CLASSES}
      onSubmit={handleSubmit}
      ref={setComposer}
    >
      <Show
        when={isExpanded()}
        fallback={
          <DialogueTrigger
            disabled={isDisabled()}
            loading={Boolean(props.loading)}
            onClick={expand}
            onMount={handleTriggerMount}
          />
        }
      >
        <label class="contents">
          <span class="sr-only">{m.dialogue_composer_input_label()}</span>
          <input
            autocomplete="off"
            class={cx(
              'h-full min-w-0 border-0 bg-transparent px-4 text-sm text-foreground outline-none',
              'placeholder:text-muted-foreground',
            )}
            disabled={props.disabled}
            onBlur={handleInputBlur}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={m.dialogue_composer_placeholder()}
            ref={handleInputMount}
            type="text"
            value={draft()}
          />
        </label>
        <button
          aria-label={
            props.loading ? m.dialogue_composer_preparing_label() : m.dialogue_composer_send_label()
          }
          class={SUBMIT_CLASSES}
          disabled={isDisabled() || !canSubmit()}
          type="submit"
        >
          <Show
            when={props.loading}
            fallback={<span aria-hidden="true" class="i-tabler-arrow-up size-5" />}
          >
            <span
              aria-hidden="true"
              class="i-tabler-loader-2 size-5 animate-spin motion-reduce:animate-none"
            />
          </Show>
        </button>
      </Show>
    </form>
  )
}
