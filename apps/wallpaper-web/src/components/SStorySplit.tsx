import {SStoryArtwork} from './SStoryArtwork'
import type {StoryPanelProps} from './story-panel-props'

export const SStorySplit = (props: StoryPanelProps) => (
  <>
    <div
      class="story-split-top absolute inset-0 overflow-hidden bg-ink"
      classList={{
        'animate-story-split-cover': props.transition.phase === 'cover',
        'animate-story-split-reveal': props.transition.phase === 'reveal',
      }}
      style={{'--panel-direction': -1, '--panel-order': 0}}
    >
      <SStoryArtwork transition={props.transition} light />
    </div>
    <div
      onAnimationEnd={(event) => props.onAnimationEnd?.(event)}
      class="story-split-bottom absolute inset-0 overflow-hidden bg-[#bda5e7]"
      classList={{
        'animate-story-split-cover': props.transition.phase === 'cover',
        'animate-story-split-reveal': props.transition.phase === 'reveal',
      }}
      style={{'--panel-direction': 1, '--panel-order': 1}}
    >
      <SStoryArtwork transition={props.transition} />
    </div>
  </>
)
