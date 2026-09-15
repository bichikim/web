import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {PScribbleFrame} from './Frame'

interface PScribblePanelProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly enabled: boolean
}

export const PScribblePanel = (props: PScribblePanelProps) => (
  <div class={cx('relative overflow-visible', props.class)}>
    <div class={cx('flex min-h-0 min-w-0 w-full', props.enabled && 'pomo-scribble-mask')}>
      {props.children}
    </div>
    <Show when={props.enabled}>
      <PScribbleFrame />
    </Show>
  </div>
)
