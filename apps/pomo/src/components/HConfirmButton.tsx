import {type JSX, Show} from 'solid-js'

import {useConfirmPress} from './use-confirm-press'

export interface HConfirmButtonProps {
  readonly accessibleLabel: string
  readonly children: JSX.Element
  readonly class?: string
  readonly confirmationAccessibleLabel: string
  readonly confirmationChildren: JSX.Element
  readonly disabled?: boolean
  readonly onConfirm: () => void
}

export const HConfirmButton = (props: HConfirmButtonProps) => {
  const confirmation = useConfirmPress({onConfirm: () => props.onConfirm()})

  const handleKeyDown: JSX.EventHandler<HTMLButtonElement, KeyboardEvent> = (event) => {
    if (event.key !== 'Escape' || !confirmation.isConfirming()) {
      return
    }

    event.preventDefault()
    confirmation.reset()
  }

  return (
    <button
      aria-label={
        confirmation.isConfirming() ? props.confirmationAccessibleLabel : props.accessibleLabel
      }
      class={props.class}
      data-confirming={confirmation.isConfirming() ? '' : undefined}
      disabled={props.disabled}
      onBlur={confirmation.reset}
      onClick={confirmation.press}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <Show fallback={props.children} when={confirmation.isConfirming()}>
        {props.confirmationChildren}
      </Show>
    </button>
  )
}
