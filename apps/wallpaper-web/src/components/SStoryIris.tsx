import {SStoryArtwork} from './SStoryArtwork'
import type {StoryPanelProps} from './story-panel-props'

export const SStoryIris = (props: StoryPanelProps) => (
  <div class="absolute inset-0 [--iris-x:56%] [--iris-y:60%] sm:[--iris-x:76%]">
    <div
      class="absolute inset-0 bg-[#9fd5e9]"
      classList={{
        'animate-story-iris-back-cover': props.transition.phase === 'cover',
        'animate-story-iris-back-reveal': props.transition.phase === 'reveal',
      }}
    />
    <div
      onAnimationEnd={(event) => props.onAnimationEnd?.(event)}
      class="absolute inset-0 overflow-hidden bg-[#bda5e7]"
      classList={{
        'animate-story-iris-cover': props.transition.phase === 'cover',
        'animate-story-iris-reveal': props.transition.phase === 'reveal',
      }}
    >
      <SStoryArtwork transition={props.transition} />
    </div>
  </div>
)
