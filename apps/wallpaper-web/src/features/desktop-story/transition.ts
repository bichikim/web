import type {StoryState} from './types'

export const INITIAL_STORY: StoryState = {chapter: -1, requested: -1, revision: 0, transition: null}

type StoryEvent =
  | {readonly type: 'request'; readonly chapter: number; readonly reducedMotion?: boolean}
  | {readonly type: 'covered' | 'finished'; readonly revision: number}

const begin = (state: StoryState): StoryState =>
  state.requested === state.chapter
    ? state
    : {
        ...state,
        revision: state.revision + 1,
        transition: {
          direction: state.requested > state.chapter ? 1 : -1,
          from: state.chapter,
          phase: 'cover',
          revision: state.revision + 1,
          to: state.requested,
        },
      }

export const advanceStoryTransition = (state: StoryState, event: StoryEvent): StoryState => {
  switch (event.type) {
    case 'request': {
      if (event.reducedMotion) {
        return {...state, chapter: event.chapter, requested: event.chapter, transition: null}
      }
      if (state.transition !== null || state.requested === event.chapter) {
        return state
      }
      const requested = {...state, requested: event.chapter}
      return begin(requested)
    }
    case 'covered': {
      const {transition} = state
      return transition?.revision === event.revision && transition.phase === 'cover'
        ? {...state, chapter: transition.to, transition: {...transition, phase: 'reveal'}}
        : state
    }
    case 'finished': {
      const {transition} = state
      return transition?.revision === event.revision && transition.phase === 'reveal'
        ? {...state, transition: null}
        : state
    }
    default: {
      const exhaustive: never = event
      return exhaustive
    }
  }
}
