export type RepeatMode = 'none' | 'repeat-all' | 'repeat-one'

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

  if (options.currentIndex < options.trackCount - 1) {
    return 'play-next'
  }

  return options.repeatMode === 'repeat-all' ? 'play-first' : 'stop'
}
