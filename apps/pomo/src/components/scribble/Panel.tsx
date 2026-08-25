import {cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

import {PScribbleFrame, SCRIBBLE_MASK_IMAGE} from './Frame'

const SCRIBBLE_PANEL_MASK_CLASSES = [
  '[mask-image:var(--pomo-scribble-panel-mask)]',
  '[-webkit-mask-image:var(--pomo-scribble-panel-mask)]',
  '[mask-mode:alpha] [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]',
  '[-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat]',
  '[-webkit-mask-size:100%_100%]',
].join(' ')

interface PScribblePanelProps {
  readonly children: JSX.Element
  readonly class?: string
  readonly enabled: boolean
  readonly frameClass: string
}

export const PScribblePanel = (props: PScribblePanelProps) => (
  <div class={cx('relative overflow-visible', props.class)}>
    <div
      class={cx(
        'pomo-scribble-panel__surface flex min-h-0 min-w-0 w-full',
        props.enabled && SCRIBBLE_PANEL_MASK_CLASSES,
      )}
      style={{'--pomo-scribble-panel-mask': SCRIBBLE_MASK_IMAGE}}
    >
      {props.children}
    </div>
    <Show when={props.enabled}>
      <PScribbleFrame class={props.frameClass} />
    </Show>
  </div>
)
