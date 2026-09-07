import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import * as m from '@paraglide/message'

const TRIGGER_CLASSES = cx(
  'grid size-full cursor-pointer place-items-center border-0 bg-transparent',
  'text-highlight outline-none hover:bg-surface-interactive disabled:cursor-not-allowed',
)

interface DialogueTriggerProps {
  readonly disabled: boolean
  readonly loading: boolean
  readonly onClick: () => void
  readonly onMount: (element: HTMLButtonElement) => void
}

export const DialogueTrigger = (props: DialogueTriggerProps) => (
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
