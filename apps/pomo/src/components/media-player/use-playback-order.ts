import {type Accessor, createSignal, untrack} from 'solid-js'
import {
  type ManualNavigationResolution,
  normalizeTrackIndex,
  type RepeatMode,
  resolveManualNavigation,
  resolveTrackEnd,
  type TrackNavigationDirection,
} from '../../features/focus-room-audio'
import type {SelectRandomTrackOptions, SelectTrackOptions} from './types'

export interface UsePlaybackOrderProps {
  readonly currentIndex: Accessor<number>
  readonly trackCount: Accessor<number>
  readonly initialQueue: readonly number[]
  readonly createShuffleQueue: ShuffleQueueFactory
  readonly onSelect: (options: SelectTrackOptions) => void
  readonly onRestart: () => void
  readonly onStop: () => void
}

export interface ShuffleQueueFactoryOptions {
  readonly currentIndex: number
  readonly trackCount: number
}

export type ShuffleQueueFactory = (options: ShuffleQueueFactoryOptions) => readonly number[]

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
  readonly resolveManualNavigation: (
    direction: TrackNavigationDirection,
    snapshot: PlaybackSnapshot,
  ) => ManualNavigationResolution
  readonly resetShuffleQueue: (snapshot?: PlaybackSnapshot) => void
  readonly state: PlaybackOrderState
}

const selectSequentialTrack = (
  onSelect: (options: SelectTrackOptions) => void,
  options: {
    readonly currentIndex: number
    readonly direction: TrackNavigationDirection
    readonly shouldResume?: boolean
    readonly trackCount: number
  },
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

const applyManualNavigation = (
  context: PlaybackNavigationContext,
  resolution: Extract<ManualNavigationResolution, {readonly type: 'select'}>,
  snapshot: PlaybackSnapshot,
) => {
  if (resolution.shuffleQueue === 'reset') {
    context.resetShuffleQueue({currentIndex: resolution.index, trackCount: snapshot.trackCount})
  } else {
    context.state.setShuffleQueue(resolution.shuffleQueue)
  }
  context.state.setShuffleHistory(resolution.shuffleHistory)
  context.onSelect({index: resolution.index})
}

const resolveManualNavigationForExecution = (
  context: PlaybackNavigationContext,
  direction: TrackNavigationDirection,
  snapshot: PlaybackSnapshot,
): Exclude<ManualNavigationResolution, {readonly type: 'reset-shuffle-queue'}> => {
  const resolution = context.resolveManualNavigation(direction, snapshot)

  if (resolution.type !== 'reset-shuffle-queue') {
    return resolution
  }

  const currentIndex = normalizeTrackIndex(snapshot.currentIndex, snapshot.trackCount)

  if (currentIndex === undefined) {
    return {type: 'none'}
  }

  context.resetShuffleQueue(snapshot)
  const refreshedResolution = context.resolveManualNavigation(direction, snapshot)
  return refreshedResolution.type === 'reset-shuffle-queue' ? {type: 'none'} : refreshedResolution
}

/** 이전·다음 곡, 반복·셔플 순서와 셔플 이력을 관리한다. */
// oxlint-disable-next-line eslint/max-lines-per-function -- Playback order coordinates mode state, manual resolution, and natural ending in one public controller contract.
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
        : props.createShuffleQueue({
            currentIndex: normalizedCurrentIndex,
            trackCount: snapshot.trackCount,
          }),
    )
  }
  const resolveManualNavigationForSnapshot = (
    direction: TrackNavigationDirection,
    snapshot: PlaybackSnapshot,
  ): ManualNavigationResolution =>
    resolveManualNavigation({
      currentIndex: snapshot.currentIndex,
      direction,
      repeatMode: repeatMode(),
      shuffleEnabled: shuffleEnabled(),
      shuffleHistory: shuffleHistory(),
      shuffleQueue: shuffleQueue(),
      trackCount: snapshot.trackCount,
    })
  const navigationContext: PlaybackNavigationContext = {
    onRestart: () => props.onRestart(),
    onSelect: (options) => props.onSelect(options),
    resetShuffleQueue,
    resolveManualNavigation: resolveManualNavigationForSnapshot,
    state,
  }
  const canNavigateNextTrack = () =>
    resolveManualNavigationForSnapshot('next', readSnapshot()).type !== 'none'
  const canNavigatePreviousTrack = () =>
    resolveManualNavigationForSnapshot('previous', readSnapshot()).type !== 'none'
  const selectManualTrack = (direction: TrackNavigationDirection) => {
    const snapshot = readSnapshot()
    const resolution = resolveManualNavigationForExecution(navigationContext, direction, snapshot)

    switch (resolution.type) {
      case 'none':
        return
      case 'restart':
        navigationContext.onRestart()
        return
      case 'select':
        applyManualNavigation(navigationContext, resolution, snapshot)
        return
      default: {
        const unexpectedResolution: never = resolution
        throw new Error(`Unsupported manual navigation resolution: ${unexpectedResolution}`)
      }
    }
  }
  const selectPreviousTrack = () => selectManualTrack('previous')
  const selectNextTrack = () => selectManualTrack('next')

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
