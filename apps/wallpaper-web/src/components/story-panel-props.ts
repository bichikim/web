import type {JSX} from 'solid-js'
import type {StoryTransition} from '../features/desktop-story/types'

export interface StoryPanelProps {
  /** Current chapter pair, phase and travel direction. */
  readonly transition: StoryTransition
  /** The final panel signals complete coverage or complete exit. */
  readonly onAnimationEnd?: JSX.EventHandler<HTMLDivElement, AnimationEvent>
}
