import {createMemo, type JSX} from 'solid-js'
import type {StoryTransition} from '../features/desktop-story/types'

interface SStoryMaskProps {
  /** Presentation layer clipped at the center of the moving color plane. */
  readonly children?: JSX.Element
  /** Retain a mounted background while it is not displayed. */
  readonly hidden?: boolean
  /** Previous content occupies the opposite half from incoming content. */
  readonly outgoing?: boolean
  /** No mask is applied outside a diagonal transition. */
  readonly transition?: StoryTransition | null
}

export const SStoryMask = (props: SStoryMaskProps) => {
  const leftSide = createMemo(() =>
    props.transition?.direction === -1 ? !props.outgoing : props.outgoing === true,
  )
  return (
    <div
      class="pointer-events-none absolute inset-y-0"
      aria-hidden={props.outgoing || props.hidden || undefined}
      inert={Boolean(props.outgoing || props.transition)}
      data-story-mask={props.transition ? (props.outgoing ? 'outgoing' : 'incoming') : undefined}
      classList={{
        'animate-story-scene-cover': props.transition?.phase === 'cover',
        'animate-story-scene-reveal': props.transition?.phase === 'reveal',
        'inset-x-0': !props.transition,
        invisible: props.hidden,
        'story-scene-left': Boolean(props.transition && leftSide()),
        'story-scene-right': Boolean(props.transition && !leftSide()),
      }}
      style={{'--wipe-direction': props.transition?.direction ?? 1}}
    >
      <div
        class="absolute inset-y-0"
        classList={{
          'animate-story-scene-content-cover': props.transition?.phase === 'cover',
          'animate-story-scene-content-reveal': props.transition?.phase === 'reveal',
          'inset-x-0': !props.transition,
          'story-scene-content-left': Boolean(props.transition && leftSide()),
          'story-scene-content-right': Boolean(props.transition && !leftSide()),
        }}
      >
        {props.children}
      </div>
    </div>
  )
}
