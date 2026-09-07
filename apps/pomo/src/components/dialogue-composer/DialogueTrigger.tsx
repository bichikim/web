import {PTooltip} from '../PTooltip'
import {useTooltipTrigger} from '../tooltip'
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

export const DialogueTrigger = (props: DialogueTriggerProps) => {
  const tooltip = useTooltipTrigger()
  const label = () =>
    props.loading ? m.dialogue_composer_preparing_label() : m.dialogue_composer_start_label()
  return (
    <>
      <button
        {...tooltip.events}
        aria-expanded="false"
        aria-label={label()}
        class={TRIGGER_CLASSES}
        disabled={props.disabled}
        onClick={() => props.onClick()}
        ref={(element) => {
          tooltip.setTarget(element)
          props.onMount(element)
        }}
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
      <PTooltip target={tooltip.target()} show={tooltip.show()} text={label()} />
    </>
  )
}
