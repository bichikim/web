import type {HitMask} from './types'

interface CreateHitMaskOptions {
  readonly alphaThreshold?: number
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}
const CHANNELS = 4
const ALPHA_CHANNEL = 3

/** Encodes nontransparent pixels as disjoint horizontal spans, preserving alpha holes. */
export const createHitMask = (options: CreateHitMaskOptions): HitMask => {
  const runs: [number, number, number][] = []
  for (let row = 0; row < options.height; row += 1) {
    let start: number | null = null
    for (let column = 0; column <= options.width; column += 1) {
      const visible =
        column < options.width &&
        options.data[(row * options.width + column) * CHANNELS + ALPHA_CHANNEL]! >
          (options.alphaThreshold ?? 0)
      if (visible && start === null) {
        start = column
      }
      if (!visible && start !== null) {
        runs.push([row, start, column])
        start = null
      }
    }
  }
  return {height: options.height, runs, width: options.width}
}
