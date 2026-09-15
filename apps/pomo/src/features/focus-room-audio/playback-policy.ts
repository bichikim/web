export type RepeatMode = 'none' | 'repeat-all' | 'repeat-one'

export type TrackNavigationDirection = 'next' | 'previous'

export interface CanNavigateManuallyOptions {
  readonly currentIndex: number
  readonly direction: TrackNavigationDirection
  readonly hasShuffleHistory: boolean
  readonly repeatMode: RepeatMode
  readonly shuffleEnabled: boolean
  readonly shuffleRemaining: number
  readonly trackCount: number
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

/** Resolves whether manual navigation has a permitted destination. */
export const canNavigateManually = (options: CanNavigateManuallyOptions): boolean => {
  if (options.trackCount < 1) {
    return false
  }

  if (options.repeatMode !== 'none') {
    return true
  }

  if (options.trackCount < 2) {
    return false
  }

  if (options.direction === 'previous') {
    if (options.shuffleEnabled && options.hasShuffleHistory) {
      return true
    }

    return hasSequentialTrack(options)
  }

  if (options.shuffleEnabled) {
    return options.shuffleRemaining > 0
  }

  return hasSequentialTrack(options)
}

/** Normalizes a track index for a non-empty track list. */
export const normalizeTrackIndex = (index: number, trackCount: number): number | undefined => {
  if (trackCount < 1 || !Number.isInteger(trackCount) || !Number.isInteger(index)) {
    return undefined
  }

  const remainder = index % trackCount
  return remainder < 0 ? remainder + trackCount : remainder
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
