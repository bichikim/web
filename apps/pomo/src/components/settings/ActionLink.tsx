import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const ACTION_LINK_CLASSES = cx(
  'inline-flex min-h-9 box-border flex-none cursor-pointer items-center justify-center gap-[0.35rem]',
  'rounded-control border border-solid border-highlight bg-transparent px-3 py-0',
  'text-[0.7rem] font-bold text-foreground no-underline [font:inherit]',
  'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
  'hover:bg-secondary-soft focus-visible:outline-2 focus-visible:outline-solid',
  'focus-visible:outline-highlight focus-visible:[outline-offset:0.125rem] motion-reduce:transition-none',
)

export interface PSettingsActionLinkProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly href: string
  readonly icon?: string
}

export const PSettingsActionLink = (props: PSettingsActionLinkProps) => (
  <A class={cx(ACTION_LINK_CLASSES, props.class)} href={props.href}>
    <Show when={props.icon}>
      {(icon) => <span aria-hidden="true" class={cx(icon(), 'size-4')} />}
    </Show>
    {props.children}
  </A>
)
