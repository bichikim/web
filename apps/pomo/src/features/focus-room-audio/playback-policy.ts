export type RepeatMode = 'none' | 'repeat-all' | 'repeat-one'

export type TrackNavigationDirection = 'next' | 'previous'

export interface ResolveManualNavigationOptions {
  readonly currentIndex: number
  readonly direction: TrackNavigationDirection
  readonly repeatMode: RepeatMode
  readonly shuffleEnabled: boolean
  readonly shuffleHistory: readonly number[]
  readonly shuffleQueue: readonly number[]
  readonly trackCount: number
}

export type ManualNavigationShuffleQueue = readonly number[] | 'reset'

export type ManualNavigationResolution =
  | {readonly type: 'none'}
  | {readonly type: 'restart'}
  | {readonly type: 'reset-shuffle-queue'}
  | {
      readonly type: 'select'
      readonly index: number
      readonly shuffleHistory: readonly number[]
      readonly shuffleQueue: ManualNavigationShuffleQueue
    }

interface SequentialTrackOptions {
  readonly currentIndex: number
  readonly direction: TrackNavigationDirection
  readonly trackCount: number
}

export interface ResolveTrackEndOptions {
  readonly currentIndex: number
  readonly repeatMode: RepeatMode
  readonly shuffleEnabled: boolean
  readonly shuffleRemaining: number
  readonly trackCount: number
}

export type TrackEndAction =
  | 'play-first'
  | 'play-next'
  | 'play-shuffled'
  | 'restart-current'
  | 'restart-shuffle'
  | 'stop'

export interface ResolveTrackRemovalOptions {
  readonly currentIndex: number
  readonly removeIndex: number
  readonly trackCount: number
}

export interface TrackRemovalResolution {
  readonly currentTrackChanged: boolean
  readonly nextCurrentIndex: number
}

const hasSequentialTrack = (options: SequentialTrackOptions): boolean => {
  switch (options.direction) {
    case 'next':
      return options.currentIndex < options.trackCount - 1
    case 'previous':
      return options.currentIndex > 0
    default: {
      const unexpectedDirection: never = options.direction
      throw new Error(`Unsupported track navigation direction: ${unexpectedDirection}`)
    }
  }
}

/** Normalizes a track index for a non-empty track list. */
export const normalizeTrackIndex = (index: number, trackCount: number): number | undefined => {
  if (trackCount < 1 || !Number.isInteger(trackCount) || !Number.isInteger(index)) {
    return undefined
  }

  const remainder = index % trackCount
  return remainder < 0 ? remainder + trackCount : remainder
}

const resolveSequentialIndex = (
  options: ResolveManualNavigationOptions,
  currentIndex: number,
): number | undefined => {
  const canSelectSequentially =
    options.repeatMode !== 'none' ||
    hasSequentialTrack({
      currentIndex,
      direction: options.direction,
      trackCount: options.trackCount,
    })

  if (!canSelectSequentially) {
    return undefined
  }

  const offset = options.direction === 'next' ? 1 : -1
  return normalizeTrackIndex(currentIndex + offset, options.trackCount)
}

/** Resolves the destination and shuffle state for one manual navigation command. */
export const resolveManualNavigation = (
  options: ResolveManualNavigationOptions,
): ManualNavigationResolution => {
  const currentIndex = normalizeTrackIndex(options.currentIndex, options.trackCount)

  if (currentIndex === undefined) {
    return {type: 'none'}
  }

  if (options.trackCount < 2) {
    if (options.repeatMode === 'none') {
      return {type: 'none'}
    }

    if (options.direction === 'next') {
      return {type: 'restart'}
    }

    return {
      index: currentIndex,
      shuffleHistory: options.shuffleHistory,
      shuffleQueue: options.shuffleEnabled ? 'reset' : options.shuffleQueue,
      type: 'select',
    }
  }

  if (options.direction === 'previous' && options.shuffleEnabled) {
    const previousHistoryIndex = options.shuffleHistory.at(-1)

    if (previousHistoryIndex !== undefined) {
      const selectedIndex = normalizeTrackIndex(previousHistoryIndex, options.trackCount)

      if (selectedIndex === undefined) {
        return {type: 'none'}
      }

      return {
        index: selectedIndex,
        shuffleHistory: options.shuffleHistory.slice(0, -1),
        shuffleQueue: [
          currentIndex,
          ...options.shuffleQueue.filter(
            (index) => index !== selectedIndex && index !== currentIndex,
          ),
        ],
        type: 'select',
      }
    }
  }

  if (options.direction === 'next' && options.shuffleEnabled) {
    const [nextShuffleIndex] = options.shuffleQueue

    if (nextShuffleIndex === undefined) {
      return options.repeatMode === 'none' ? {type: 'none'} : {type: 'reset-shuffle-queue'}
    }

    const selectedIndex = normalizeTrackIndex(nextShuffleIndex, options.trackCount)

    if (selectedIndex === undefined) {
      return {type: 'none'}
    }

    return {
      index: selectedIndex,
      shuffleHistory: [...options.shuffleHistory, currentIndex],
      shuffleQueue: options.shuffleQueue.slice(1),
      type: 'select',
    }
  }

  const selectedIndex = resolveSequentialIndex(options, currentIndex)

  if (selectedIndex === undefined) {
    return {type: 'none'}
  }

  return {
    index: selectedIndex,
    shuffleHistory: options.shuffleHistory,
    shuffleQueue: options.shuffleEnabled ? 'reset' : options.shuffleQueue,
    type: 'select',
  }
}

/** Resolves the active track after removing one queue item. */
export const resolveTrackRemoval = (
  options: ResolveTrackRemovalOptions,
): TrackRemovalResolution => {
  const nextTrackCount = Math.max(0, options.trackCount - 1)

  if (nextTrackCount === 0) {
    return {currentTrackChanged: true, nextCurrentIndex: 0}
  }

  if (options.removeIndex < options.currentIndex) {
    return {currentTrackChanged: false, nextCurrentIndex: options.currentIndex - 1}
  }

  if (options.removeIndex === options.currentIndex) {
    return {
      currentTrackChanged: true,
      nextCurrentIndex: Math.min(options.currentIndex, nextTrackCount - 1),
    }
  }

  return {currentTrackChanged: false, nextCurrentIndex: options.currentIndex}
}

export const resolveTrackEnd = (options: ResolveTrackEndOptions): TrackEndAction => {
  if (options.repeatMode === 'repeat-one') {
    return 'restart-current'
  }

  if (options.trackCount < 2) {
    return options.repeatMode === 'repeat-all' ? 'restart-current' : 'stop'
  }

  if (options.shuffleEnabled) {
    if (options.shuffleRemaining > 0) {
      return 'play-shuffled'
    }

    return options.repeatMode === 'repeat-all' ? 'restart-shuffle' : 'stop'
  }

  if (
    hasSequentialTrack({
      currentIndex: options.currentIndex,
      direction: 'next',
      trackCount: options.trackCount,
    })
  ) {
    return 'play-next'
  }

  return options.repeatMode === 'repeat-all' ? 'play-first' : 'stop'
}
