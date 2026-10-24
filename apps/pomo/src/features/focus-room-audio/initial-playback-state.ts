import {createShuffleQueue} from './shuffle-queue'

export interface CreateInitialPlaybackStateOptions {
  readonly trackCount: number
}

export interface InitialPlaybackState {
  readonly currentIndex: number
  readonly queue: number[]
}

export const createInitialPlaybackState = (
  options: CreateInitialPlaybackStateOptions,
): InitialPlaybackState => {
  const queue = createShuffleQueue({trackCount: options.trackCount})

  return {currentIndex: queue.shift() ?? 0, queue}
}
