import type {StoryTransition} from './types'

const STYLES = ['diagonal', 'bands', 'split', 'iris', 'split', 'diagonal'] as const

/** Preserve each boundary's transition when scrolling in either direction. */
export const getStoryTransitionStyle = (transition: Pick<StoryTransition, 'from' | 'to'>) =>
  STYLES[Math.max(transition.from, transition.to)] ?? 'diagonal'
