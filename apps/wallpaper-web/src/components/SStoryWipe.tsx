import {For, type JSX, Show} from 'solid-js'
import type {StoryPanelProps} from './story-panel-props'
import {SStoryPrint} from './SStoryPrint'
import chapters from '../data/story/chapters.json'

const FRONT_LAYER = 2

/** Three color planes settle, then leave along the same diagonal. */
export const SStoryWipe = (props: StoryPanelProps) => (
  <For each={['bg-ink', 'bg-[#accfe6]', 'bg-[#d5c4ee]']}>
    {(color, index) => {
      const handleEnd: JSX.EventHandler<HTMLDivElement, AnimationEvent> = (event) => {
        if (index() === FRONT_LAYER) {
          props.onAnimationEnd?.(event)
        }
      }
      return (
        <div
          onAnimationEnd={handleEnd}
          style={{'--wipe-index': index()}}
          class={`absolute inset-0 overflow-hidden ${color}`}
          classList={{
            'animate-story-plane-cover-back': props.transition.phase === 'cover' && index() === 0,
            'animate-story-plane-cover-front':
              props.transition.phase === 'cover' && index() === FRONT_LAYER,
            'animate-story-plane-cover-mid': props.transition.phase === 'cover' && index() === 1,
            'animate-story-plane-reveal-back': props.transition.phase === 'reveal' && index() === 0,
            'animate-story-plane-reveal-front':
              props.transition.phase === 'reveal' && index() === FRONT_LAYER,
            'animate-story-plane-reveal-mid': props.transition.phase === 'reveal' && index() === 1,
          }}
        >
          <div
            class="absolute left-[calc(100%/6)] -top-[40%] flex h-[180%] w-[calc(100%*2/3)]
            items-center justify-center"
            classList={{
              'animate-story-original-cover-back':
                props.transition.phase === 'cover' && index() === 0,
              'animate-story-original-cover-front':
                props.transition.phase === 'cover' && index() === FRONT_LAYER,
              'animate-story-original-cover-mid':
                props.transition.phase === 'cover' && index() === 1,
              'animate-story-original-reveal-back':
                props.transition.phase === 'reveal' && index() === 0,
              'animate-story-original-reveal-front':
                props.transition.phase === 'reveal' && index() === FRONT_LAYER,
              'animate-story-original-reveal-mid':
                props.transition.phase === 'reveal' && index() === 1,
            }}
          >
            <SStoryPrint light={index() === 0} />
            <Show when={index() === FRONT_LAYER}>
              <div
                class="w-[106.6667dvh] shrink-0 -rotate-6 whitespace-nowrap text-[40dvh] font-900 leading-[0.8]
              tracking-[-0.07em] text-ink [font-family:Arial,Helvetica,sans-serif]"
              >
                <For each={[0, 1, 2]}>
                  {(row) => (
                    <p
                      classList={{
                        'animate-story-original-type-cover': props.transition.phase === 'cover',
                        'animate-story-original-type-reveal': props.transition.phase === 'reveal',
                      }}
                      style={{'--row-direction': row % 2 ? -1 : 1}}
                    >
                      {chapters[props.transition.to]?.word ?? 'PLAY'} /{' '}
                      {chapters[props.transition.to]?.word ?? 'PLAY'}
                    </p>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      )
    }}
  </For>
)
