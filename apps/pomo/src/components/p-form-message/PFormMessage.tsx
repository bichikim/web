import {Alert} from '@kobalte/core/alert'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const TONE_CLASSES = {
  error: 'bg-danger/10 text-danger',
  success: 'bg-secondary-soft text-foreground',
} as const

export interface PFormMessageProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly tone: keyof typeof TONE_CLASSES
}

export const PFormMessage = (props: PFormMessageProps) => {
  const classes = () =>
    cx('m-0 rounded-panel-inner px-4 py-3 text-sm leading-6', TONE_CLASSES[props.tone], props.class)

  return (
    <Show
      when={props.tone === 'error'}
      fallback={
        <p class={classes()} role="status">
          {props.children}
        </p>
      }
    >
      <Alert class={classes()}>{props.children}</Alert>
    </Show>
  )
}
