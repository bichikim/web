import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {PScribbleCircleFrame} from './PScribbleCircleFrame'

interface PScribbleCircleControlProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly enabled: boolean
}

export const PScribbleCircleControl = (props: PScribbleCircleControlProps) => (
  <span
    class={cx('pomo-scribble-circle-control relative inline-flex overflow-visible', props.class)}
  >
    {props.children}
    <Show when={props.enabled}>
      <PScribbleCircleFrame class="pomo-scribble-circle-border" />
    </Show>
  </span>
)
