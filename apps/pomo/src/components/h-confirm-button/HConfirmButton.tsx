import {type JSX} from 'solid-js'

import {HButton} from '../h-button'
import {useConfirmPress} from '../use-confirm-press'

export interface HConfirmButtonProps {
  readonly accessibleLabel: string
  readonly children: JSX.Element
  readonly class?: string
  readonly confirmationAccessibleLabel: string
  readonly confirmationChildren: JSX.Element
  readonly disabled?: boolean
  readonly onConfirm: () => void
  readonly reserveSpace?: boolean
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
    <HButton.Root
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
      <span class="grid">
        <span
          aria-hidden={confirmation.isConfirming() ? 'true' : undefined}
          class="col-start-1 row-start-1 items-center justify-center gap-2"
          classList={{
            hidden: props.reserveSpace === false && confirmation.isConfirming(),
            'inline-flex': props.reserveSpace !== false || !confirmation.isConfirming(),
            invisible: props.reserveSpace !== false && confirmation.isConfirming(),
          }}
        >
          {props.children}
        </span>
        <span
          aria-hidden={confirmation.isConfirming() ? undefined : 'true'}
          class="col-start-1 row-start-1 items-center justify-center gap-2"
          classList={{
            hidden: props.reserveSpace === false && !confirmation.isConfirming(),
            'inline-flex': props.reserveSpace !== false || confirmation.isConfirming(),
            invisible: props.reserveSpace !== false && !confirmation.isConfirming(),
          }}
        >
          <span aria-hidden="true" class="i-tabler-check size-4 flex-none" />
          {props.confirmationChildren}
        </span>
      </span>
    </HButton.Root>
  )
}
