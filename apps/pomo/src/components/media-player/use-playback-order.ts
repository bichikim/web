import {type Accessor, createSignal, untrack} from 'solid-js'
import {
  canNavigateManually,
  createShuffleQueue,
  normalizeTrackIndex,
  type RepeatMode,
  resolveTrackEnd,
  type TrackNavigationDirection,
} from '../../features/focus-room-audio'
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
  readonly canNavigateNextTrack: Accessor<boolean>
  readonly canNavigatePreviousTrack: Accessor<boolean>
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

interface SelectSequentialTrackOptions {
  readonly currentIndex: number
  readonly direction: TrackNavigationDirection
  readonly shouldResume?: boolean
  readonly trackCount: number
}

interface PlaybackSnapshot {
  readonly currentIndex: number
  readonly trackCount: number
}

interface SelectRandomTrackSelectionOptions extends SelectRandomTrackOptions {
  readonly currentIndex: number
  readonly trackCount: number
}

interface PlaybackOrderState {
  readonly setShuffleHistory: (history: readonly number[]) => void
  readonly setShuffleQueue: (queue: readonly number[]) => void
  readonly shuffleHistory: Accessor<readonly number[]>
  readonly shuffleQueue: Accessor<readonly number[]>
}

interface PlaybackNavigationContext {
  readonly onRestart: () => void
  readonly onSelect: (options: SelectTrackOptions) => void
  readonly readSnapshot: () => PlaybackSnapshot
  readonly repeatMode: Accessor<RepeatMode>
  readonly resetShuffleQueue: (snapshot?: PlaybackSnapshot) => void
  readonly shuffleEnabled: Accessor<boolean>
  readonly state: PlaybackOrderState
}

const selectSequentialTrack = (
  onSelect: (options: SelectTrackOptions) => void,
  options: SelectSequentialTrackOptions,
): number | undefined => {
  const currentTrackIndex = normalizeTrackIndex(options.currentIndex, options.trackCount)
  const offset = options.direction === 'next' ? 1 : -1
  const nextIndex =
    currentTrackIndex === undefined
      ? undefined
      : normalizeTrackIndex(currentTrackIndex + offset, options.trackCount)

  if (nextIndex === undefined) {
    return undefined
  }

  onSelect(
    options.shouldResume === undefined
      ? {index: nextIndex}
      : {index: nextIndex, shouldResume: options.shouldResume},
  )
  return nextIndex
}

const selectRandomTrack = (
  context: PlaybackNavigationContext,
  options: SelectRandomTrackSelectionOptions,
) => {
  const currentTrackIndex = normalizeTrackIndex(options.currentIndex, options.trackCount)

  if (currentTrackIndex === undefined) {
    return
  }

  if (options.trackCount < 2) {
    context.onSelect({index: currentTrackIndex, shouldResume: options.shouldResume})
    return
  }

  const shuffleQueue = context.state.shuffleQueue()
  const [nextIndex] = shuffleQueue
  context.state.setShuffleQueue(shuffleQueue.slice(1))
  const selectedIndex =
    nextIndex === undefined ? undefined : normalizeTrackIndex(nextIndex, options.trackCount)

  if (selectedIndex === undefined) {
    return
  }

  context.state.setShuffleHistory([...context.state.shuffleHistory(), currentTrackIndex])
  context.onSelect({index: selectedIndex, shouldResume: options.shouldResume})
}

const canNavigateTrack = (
  context: PlaybackNavigationContext,
  direction: TrackNavigationDirection,
  snapshot = context.readSnapshot(),
): boolean => {
  const currentTrackIndex = normalizeTrackIndex(snapshot.currentIndex, snapshot.trackCount)

  return (
    currentTrackIndex !== undefined &&
    canNavigateManually({
      currentIndex: currentTrackIndex,
      direction,
      hasShuffleHistory: context.state.shuffleHistory().length > 0,
      repeatMode: context.repeatMode(),
      shuffleEnabled: context.shuffleEnabled(),
      shuffleRemaining: context.state.shuffleQueue().length,
      trackCount: snapshot.trackCount,
    })
  )
}

const selectPreviousManualTrack = (context: PlaybackNavigationContext) => {
  const snapshot = context.readSnapshot()
  const {trackCount} = snapshot
  const currentTrackIndex = normalizeTrackIndex(snapshot.currentIndex, trackCount)
  const isShuffleEnabled = context.shuffleEnabled()
  const hasShuffleHistory = context.state.shuffleHistory().length > 0

  if (currentTrackIndex === undefined) {
    return
  }

  if (!canNavigateTrack(context, 'previous', snapshot)) {
    return
  }

  if (!isShuffleEnabled || !hasShuffleHistory) {
    const selectedIndex = selectSequentialTrack(context.onSelect, {
      currentIndex: currentTrackIndex,
      direction: 'previous',
      trackCount,
    })
    if (selectedIndex !== undefined && isShuffleEnabled) {
      context.resetShuffleQueue({currentIndex: selectedIndex, trackCount})
    }
    return
  }

  const shuffleHistory = context.state.shuffleHistory()
  const previousHistoryIndex = shuffleHistory[shuffleHistory.length - 1]
  const selectedIndex =
    previousHistoryIndex === undefined
      ? undefined
      : normalizeTrackIndex(previousHistoryIndex, trackCount)

  if (selectedIndex === undefined) {
    return
  }

  context.state.setShuffleHistory(shuffleHistory.slice(0, -1))
  const shuffleQueue = context.state
    .shuffleQueue()
    .filter((index) => index !== selectedIndex && index !== currentTrackIndex)
  context.state.setShuffleQueue([currentTrackIndex, ...shuffleQueue])
  context.onSelect({index: selectedIndex})
}

const selectNextManualTrack = (context: PlaybackNavigationContext) => {
  const snapshot = context.readSnapshot()
  const {trackCount} = snapshot
  const currentTrackIndex = normalizeTrackIndex(snapshot.currentIndex, trackCount)
  const isShuffleEnabled = context.shuffleEnabled()

  if (currentTrackIndex === undefined) {
    return
  }

  if (!canNavigateTrack(context, 'next', snapshot)) {
    return
  }

  if (trackCount < 2) {
    context.onRestart()
    return
  }

  if (isShuffleEnabled) {
    if (context.state.shuffleQueue().length === 0) {
      context.resetShuffleQueue({currentIndex: currentTrackIndex, trackCount})
    }
    selectRandomTrack(context, {currentIndex: currentTrackIndex, trackCount})
    return
  }

  selectSequentialTrack(context.onSelect, {
    currentIndex: currentTrackIndex,
    direction: 'next',
    trackCount,
  })
}

/** 이전·다음 곡, 반복·셔플 순서와 셔플 이력을 관리한다. */
export const usePlaybackOrder = (props: UsePlaybackOrderProps): PlaybackOrder => {
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('repeat-all')
  const [shuffleEnabled, setShuffleEnabled] = createSignal(true)
  const [shuffleHistory, setShuffleHistory] = createSignal<readonly number[]>([])
  const [shuffleQueue, setShuffleQueue] = createSignal<readonly number[]>(
    untrack(() => [...props.initialQueue]),
  )
  const state: PlaybackOrderState = {
    setShuffleHistory,
    setShuffleQueue,
    shuffleHistory,
    shuffleQueue,
  }
  const readSnapshot = (): PlaybackSnapshot => ({
    currentIndex: props.currentIndex(),
    trackCount: props.trackCount(),
  })
  const resetShuffleQueue = (snapshot = readSnapshot()) => {
    const normalizedCurrentIndex = normalizeTrackIndex(snapshot.currentIndex, snapshot.trackCount)
    setShuffleQueue(
      normalizedCurrentIndex === undefined
        ? []
        : createShuffleQueue({
            currentIndex: normalizedCurrentIndex,
            trackCount: snapshot.trackCount,
          }),
    )
  }
  const navigationContext: PlaybackNavigationContext = {
    onRestart: () => props.onRestart(),
    onSelect: (options) => props.onSelect(options),
    readSnapshot,
    repeatMode,
    resetShuffleQueue,
    shuffleEnabled,
    state,
  }
  const canNavigateNextTrack = () => canNavigateTrack(navigationContext, 'next')
  const canNavigatePreviousTrack = () => canNavigateTrack(navigationContext, 'previous')
  const selectPreviousTrack = () => selectPreviousManualTrack(navigationContext)
  const selectNextTrack = () => selectNextManualTrack(navigationContext)

  const toggleShuffle = () => {
    const enabled = !shuffleEnabled()
    if (enabled) {
      resetShuffleQueue()
    } else {
      setShuffleQueue([])
    }
    setShuffleHistory([])
    setShuffleEnabled(enabled)
  }

  const toggleRepeatMode = (mode: Exclude<RepeatMode, 'none'>) => {
    setRepeatMode((currentMode) => (currentMode === mode ? 'none' : mode))
  }

  const selectChosenTrack = (index: number) => {
    const {trackCount} = readSnapshot()
    const selectedIndex = normalizeTrackIndex(index, trackCount)

    if (selectedIndex === undefined) {
      return
    }

    if (shuffleEnabled()) {
      resetShuffleQueue({currentIndex: selectedIndex, trackCount})
      setShuffleHistory([])
    }

    props.onSelect({index: selectedIndex})
  }

  const handleEnded = () => {
    const snapshot = readSnapshot()
    const {currentIndex: currentTrackIndex, trackCount} = snapshot
    const currentRepeatMode = repeatMode()
    const isShuffleEnabled = shuffleEnabled()
    const action = resolveTrackEnd({
      currentIndex: currentTrackIndex,
      repeatMode: currentRepeatMode,
      shuffleEnabled: isShuffleEnabled,
      shuffleRemaining: shuffleQueue().length,
      trackCount,
    })

    switch (action) {
      case 'play-first':
        props.onSelect({index: 0, shouldResume: true})
        return
      case 'play-next':
        selectSequentialTrack(props.onSelect, {
          currentIndex: currentTrackIndex,
          direction: 'next',
          shouldResume: true,
          trackCount,
        })
        return
      case 'play-shuffled':
        selectRandomTrack(navigationContext, {
          currentIndex: currentTrackIndex,
          shouldResume: true,
          trackCount,
        })
        return
      case 'restart-current':
        props.onRestart()
        return
      case 'restart-shuffle':
        resetShuffleQueue(snapshot)
        selectRandomTrack(navigationContext, {
          currentIndex: currentTrackIndex,
          shouldResume: true,
          trackCount,
        })
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
    setShuffleHistory([])
  }

  const clearShuffleQueue = () => {
    setShuffleQueue([])
    setShuffleHistory([])
  }
  return {
    canNavigateNextTrack,
    canNavigatePreviousTrack,
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
