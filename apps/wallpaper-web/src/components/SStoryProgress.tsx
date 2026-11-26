import {Show} from 'solid-js'
import chapters from '../data/story/chapters.json'
import type {StoryFrame} from '../features/desktop-story/frame'
import type {StoryTransition} from '../features/desktop-story/types'
import {SStoryMask} from './SStoryMask'

interface SStoryProgressProps {
  readonly incoming: StoryFrame
  readonly outgoing?: StoryFrame | null
  readonly transition?: StoryTransition | null
}

const SProgressRow = (props: {readonly frame: StoryFrame}) => (
  <Show when={props.frame.visible}>
    <div
      aria-hidden="true"
      class="absolute bottom-6 left-[6%] right-[6%] flex items-center gap-4 text-ink sm:left-[7%] sm:right-[7%]"
      style={{'--story-progress': props.frame.progress}}
    >
      <span class="text-[10px] font-700 tabular-nums">
        0{props.frame.chapter + 1} / 0{chapters.length}
      </span>
      <span class="h-px flex-1 bg-ink/15">
        <span class="block h-px origin-left scale-x-[var(--story-progress)] bg-ink" />
      </span>
      <span class="text-[9px] font-700 tracking-widest">SCROLL TO EXPLORE ↓</span>
    </div>
  </Show>
)

export const SStoryProgress = (props: SStoryProgressProps) => (
  <>
    <Show when={props.outgoing} keyed>
      {(frame) => (
        <SStoryMask outgoing transition={props.transition}>
          <SProgressRow frame={frame} />
        </SStoryMask>
      )}
    </Show>
    <SStoryMask transition={props.transition}>
      <SProgressRow frame={props.incoming} />
    </SStoryMask>
  </>
)
