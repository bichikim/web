import {Alert} from '@kobalte/core/alert'
import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const TONE_CLASSES = {
  error: 'bg-#b84747/18 text-#ffc6c6',
  success: 'bg-#4d9b73/18 text-#bff5d5',
} as const

export interface PFormMessageProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly tone: keyof typeof TONE_CLASSES
}

export const PFormMessage = (props: PFormMessageProps) => {
  const classes = () =>
    cx('m-0 rounded-control px-4 py-3 text-sm leading-6', TONE_CLASSES[props.tone], props.class)

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
