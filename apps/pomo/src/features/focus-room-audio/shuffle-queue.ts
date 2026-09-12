import {shuffle} from 'es-toolkit/array'

export interface CreateShuffleQueueOptions {
  readonly currentIndex?: number
  readonly shuffle?: (tracks: number[]) => number[]
  readonly trackCount: number
}

export const createShuffleQueue = (options: CreateShuffleQueueOptions): number[] =>
  (options.shuffle ?? shuffle)(
    Array.from({length: options.trackCount}, (_, index) => index).filter(
      (index) => index !== options.currentIndex,
    ),
  )
