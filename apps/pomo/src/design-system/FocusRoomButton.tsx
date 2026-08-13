import {cva, cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import './FocusRoomButton.css'

const buttonClasses = cva('focus-room-button', {
  defaultVariants: {
    size: 'medium',
    tone: 'primary',
  },
  variants: {
    size: {
      medium: 'focus-room-button--medium',
      small: 'focus-room-button--small',
    },
    tone: {
      danger: 'focus-room-button--danger',
      primary: 'focus-room-button--primary',
      secondary: 'focus-room-button--secondary',
    },
  },
})

export interface FocusRoomButtonProps extends VariantProps<typeof buttonClasses> {
  readonly children: JSX.Element
  readonly class?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly onPress: (source: HTMLButtonElement) => void
  readonly type?: 'button' | 'reset' | 'submit'
}

export const FocusRoomButton = (props: FocusRoomButtonProps) => (
  <button
    class={buttonClasses({class: props.class, size: props.size, tone: props.tone})}
    disabled={props.disabled}
    onClick={(event) => props.onPress(event.currentTarget)}
    type={props.type ?? 'button'}
  >
    <Show when={props.icon}>
      {(icon) => <span aria-hidden="true" class={cx(icon(), 'focus-room-button__icon')} />}
    </Show>
    <span>{props.children}</span>
  </button>
)
