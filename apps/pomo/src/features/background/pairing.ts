export interface PhotoSize {
  readonly width: number
  readonly height: number
}
export interface PairingOptions {
  readonly first: PhotoSize
  readonly second: PhotoSize
  readonly viewport: PhotoSize
}
export type PairDirection = 'horizontal' | 'vertical'

/** Returns a layout only when two same-orientation photos fit at the first photo's full contain size. */
export const getPairDirection = (options: PairingOptions): PairDirection | null => {
  const {first, second, viewport} = options
  if (
    [first.width, first.height, second.width, second.height, viewport.width, viewport.height].some(
      (value) => !Number.isFinite(value) || value <= 0,
    )
  ) {
    return null
  }
  const firstRatio = first.width / first.height
  const secondRatio = second.width / second.height
  const available = viewport.width / viewport.height
  if (firstRatio < 1 && secondRatio < 1 && firstRatio + secondRatio <= available) {
    return 'horizontal'
  }
  if (firstRatio > 1 && secondRatio > 1 && 1 / firstRatio + 1 / secondRatio <= 1 / available) {
    return 'vertical'
  }
  return null
}
