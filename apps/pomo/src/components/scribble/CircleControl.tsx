import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {CIRCLE_PATHS} from './circle-paths'
import {PScribbleFrame} from './Frame'

interface PScribbleCircleControlProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly enabled: boolean
}

export const PScribbleCircleControl = (props: PScribbleCircleControlProps) => (
  <span class={cx('relative inline-flex overflow-visible', props.class)}>
    {props.children}
    <Show when={props.enabled}>
      <PScribbleFrame paths={CIRCLE_PATHS} />
    </Show>
  </span>
)
