import {cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'
import {SETTINGS_ACTION_CLASSES} from './action-classes'

export interface PSettingsActionButtonProps extends VariantProps<typeof SETTINGS_ACTION_CLASSES> {
  readonly accessibleLabel?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly onPress?: (source: HTMLButtonElement) => void
  readonly type?: 'button' | 'reset' | 'submit'
}

export const PSettingsActionButton = (props: PSettingsActionButtonProps) => (
  <button
    aria-label={props.accessibleLabel}
    class={SETTINGS_ACTION_CLASSES({class: props.class, size: props.size ?? 'medium'})}
    disabled={props.disabled}
    onClick={(event) => props.onPress?.(event.currentTarget)}
    type={props.type ?? 'button'}
  >
    <Show when={props.icon}>
      {(icon) => <span aria-hidden="true" class={cx(icon(), 'size-4')} />}
    </Show>
    {props.children}
  </button>
)
