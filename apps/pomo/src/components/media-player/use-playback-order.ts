import {type Accessor, createSignal, untrack} from 'solid-js'
import {createShuffleQueue, type RepeatMode, resolveTrackEnd} from '../../features/focus-room-audio'
import type {SelectRandomTrackOptions, SelectTrackOptions} from './types'

export interface UsePlaybackOrderProps {
  readonly currentIndex: Accessor<number>
  readonly trackCount: Accessor<number>
  readonly initialQueue: readonly number[]
  readonly onSelect: (options: SelectTrackOptions) => void
  readonly onRestart: () => void
  readonly onStop: () => void
}

export interface PlaybackOrder {
  readonly repeatMode: Accessor<RepeatMode>
  readonly shuffleEnabled: Accessor<boolean>
  readonly resetOrder: () => void
  readonly clearShuffleQueue: () => void
  readonly selectChosenTrack: (index: number) => void
  readonly selectNextTrack: () => void
  readonly selectPreviousTrack: () => void
  readonly toggleRepeatMode: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly toggleShuffle: () => void
  readonly handleEnded: () => void
}

/** 이전·다음 곡, 반복·셔플 순서와 셔플 이력을 관리한다. */
export const usePlaybackOrder = (props: UsePlaybackOrderProps): PlaybackOrder => {
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('repeat-all')
  const [shuffleEnabled, setShuffleEnabled] = createSignal(true)
  let shuffleQueue = untrack(() => [...props.initialQueue])
  let shuffleHistory: number[] = []
  const resetShuffleQueue = (currentTrackIndex = props.currentIndex()) => {
    shuffleQueue = createShuffleQueue({
      currentIndex: currentTrackIndex,
      trackCount: props.trackCount(),
    })
  }

  const selectRandomTrack = (options: SelectRandomTrackOptions = {}) => {
    const trackCount = props.trackCount()

    if (trackCount < 2) {
      props.onSelect({index: props.currentIndex(), shouldResume: options.shouldResume})
      return
    }

    const nextIndex = shuffleQueue.shift()

    if (nextIndex === undefined) {
      return
    }

    shuffleHistory.push(props.currentIndex())
    props.onSelect({index: nextIndex, shouldResume: options.shouldResume})
  }

  const selectPreviousTrack = () => {
    if (!shuffleEnabled() || shuffleHistory.length === 0) {
      props.onSelect({index: props.currentIndex() - 1})
      return
    }

    const previousIndex = shuffleHistory.pop()

    if (previousIndex === undefined) {
      return
    }

    shuffleQueue.unshift(props.currentIndex())
    props.onSelect({index: previousIndex})
  }

  const toggleShuffle = () => {
    const enabled = !shuffleEnabled()
    shuffleQueue = enabled
      ? createShuffleQueue({currentIndex: props.currentIndex(), trackCount: props.trackCount()})
      : []
    shuffleHistory = []
    setShuffleEnabled(enabled)
  }

  const toggleRepeatMode = (mode: Exclude<RepeatMode, 'none'>) => {
    setRepeatMode((currentMode) => (currentMode === mode ? 'none' : mode))
  }

  const selectChosenTrack = (index: number) => {
    if (shuffleEnabled()) {
      resetShuffleQueue(index)
      shuffleHistory = []
    }

    props.onSelect({index})
  }

  const selectNextTrack = () => {
    if (props.trackCount() < 2) {
      props.onRestart()
      return
    }

    if (shuffleEnabled()) {
      if (shuffleQueue.length === 0) {
        resetShuffleQueue()
      }
      selectRandomTrack()
      return
    }

    props.onSelect({index: props.currentIndex() + 1})
  }

  const handleEnded = () => {
    const action = resolveTrackEnd({
      currentIndex: props.currentIndex(),
      repeatMode: repeatMode(),
      shuffleEnabled: shuffleEnabled(),
      shuffleRemaining: shuffleQueue.length,
      trackCount: props.trackCount(),
    })

    switch (action) {
      case 'play-first':
        props.onSelect({index: 0, shouldResume: true})
        return
      case 'play-next':
        props.onSelect({index: props.currentIndex() + 1, shouldResume: true})
        return
      case 'play-shuffled':
        selectRandomTrack({shouldResume: true})
        return
      case 'restart-current':
        props.onRestart()
        return
      case 'restart-shuffle':
        resetShuffleQueue()
        selectRandomTrack({shouldResume: true})
        return
      case 'stop':
        props.onStop()
        return
      default: {
        const unexpectedAction: never = action
        throw new Error(`Unsupported track end action: ${unexpectedAction}`)
      }
    }
  }

  const resetOrder = () => {
    resetShuffleQueue()
    shuffleHistory = []
  }

  const clearShuffleQueue = () => {
    shuffleQueue = []
    shuffleHistory = []
  }
  return {
    clearShuffleQueue,
    handleEnded,
    repeatMode,
    resetOrder,
    selectChosenTrack,
    selectNextTrack,
    selectPreviousTrack,
    shuffleEnabled,
    toggleRepeatMode,
    toggleShuffle,
  }
}
