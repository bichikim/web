import {type JSX, Match, Show, Switch} from 'solid-js'
import type {StoryTransition} from '../features/desktop-story/types'

import {getStoryTransitionStyle} from '../features/desktop-story/transition-style'
import {SStoryWipe} from './SStoryWipe'
import {SStoryBands} from './SStoryBands'
import {SStorySplit} from './SStorySplit'
import {SStoryIris} from './SStoryIris'

interface SStoryTransitionProps {
  /** A complete cover-and-reveal sequence, independent of scroll distance. */
  readonly transition?: StoryTransition | null
  /** Commit the destination after the front plane has covered the whole screen. */
  readonly onCovered?: (revision: number) => void
  /** Release the scroll lock after the exit finishes. */
  readonly onFinished?: (revision: number) => void
}

export const SStoryTransition = (props: SStoryTransitionProps) => (
  <Show when={props.transition} keyed>
    {(transition) => {
      const style = getStoryTransitionStyle(transition)
      const handleEnd: JSX.EventHandler<HTMLDivElement, AnimationEvent> = (event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (transition.phase === 'cover') {
          props.onCovered?.(transition.revision)
        } else {
          props.onFinished?.(transition.revision)
        }
      }
      return (
        <div
          aria-hidden="true"
          data-story-transition={transition.phase}
          data-story-style={style}
          class="pointer-events-none absolute inset-0 overflow-hidden"
          style={{'--wipe-direction': transition.direction}}
        >
          <Switch>
            <Match when={style === 'diagonal'}>
              <SStoryWipe transition={transition} onAnimationEnd={handleEnd} />
            </Match>
            <Match when={style === 'bands'}>
              <SStoryBands transition={transition} onAnimationEnd={handleEnd} />
            </Match>
            <Match when={style === 'split'}>
              <SStorySplit transition={transition} onAnimationEnd={handleEnd} />
            </Match>
            <Match when={style === 'iris'}>
              <SStoryIris transition={transition} onAnimationEnd={handleEnd} />
            </Match>
          </Switch>
        </div>
      )
    }}
  </Show>
)
