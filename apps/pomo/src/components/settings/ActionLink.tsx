import {A} from '@solidjs/router'
import {cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'
import {SETTINGS_ACTION_CLASSES} from './action-classes'

export interface PSettingsActionLinkProps extends VariantProps<typeof SETTINGS_ACTION_CLASSES> {
  readonly children: JSX.Element
  readonly class?: string
  readonly href: string
  readonly icon?: string
}

export const PSettingsActionLink = (props: PSettingsActionLinkProps) => (
  <A class={SETTINGS_ACTION_CLASSES({class: props.class, size: props.size})} href={props.href}>
    <Show when={props.icon}>
      {(icon) => <span aria-hidden="true" class={cx(icon(), 'size-4')} />}
    </Show>
    {props.children}
  </A>
)
