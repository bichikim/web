import {For, type JSX} from 'solid-js'
import {SStoryArtwork} from './SStoryArtwork'
import type {StoryPanelProps} from './story-panel-props'

const BAND_COUNT = 6
const BANDS = Array.from({length: BAND_COUNT}, (_, index) => index)
const COLORS = ['bg-ink', 'bg-[#9fd5e9]', 'bg-[#bda5e7]'] as const

export const SStoryBands = (props: StoryPanelProps) => (
  <div class="absolute inset-0 grid grid-rows-6">
    <For each={BANDS}>
      {(index) => {
        const handleEnd: JSX.EventHandler<HTMLDivElement, AnimationEvent> = (event) => {
          if (index === BAND_COUNT - 1) {
            props.onAnimationEnd?.(event)
          }
        }
        return (
          <div class="relative min-h-0 overflow-hidden">
            <div
              onAnimationEnd={handleEnd}
              class={`story-cut-panel absolute inset-y-0 -left-[20vmax] w-[calc(100%+40vmax)]
                overflow-hidden ${COLORS[index % COLORS.length]}`}
              classList={{
                'animate-story-band-cover': props.transition.phase === 'cover',
                'animate-story-band-reveal': props.transition.phase === 'reveal',
              }}
              style={{
                '--band-direction': (index % 2 === 0 ? 1 : -1) * props.transition.direction,
                '--band-index': index,
              }}
            >
              <SStoryArtwork
                transition={props.transition}
                light={index % COLORS.length === 0}
                print="halftone"
                repetitions={6}
                class="left-[20vmax]! text-[max(3rem,19.2dvh,12vw)]!"
              />
            </div>
          </div>
        )
      }}
    </For>
  </div>
)
