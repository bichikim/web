import type {MediaFit} from '../model'
import {getPairDirection, type PairDirection, type PhotoSize} from '../album/pairing'

export interface LayoutOptions {
  /** Media sizing; omitted to contain media and retain compatible photo pairing. */
  readonly fit?: MediaFit
  readonly first: PhotoSize
  readonly second: PhotoSize | null
  readonly viewport: PhotoSize
}
export interface PhotoPlacement {
  readonly scale: number
  readonly x: number
  readonly y: number
}
export interface FrameLayout {
  readonly direction: PairDirection | null
  readonly first: PhotoPlacement
  readonly second: PhotoPlacement | null
  readonly width: number
  readonly height: number
}

/** Centers proportionally scaled media; cover fills the viewport and hides companion photos. */
export const calculateLayout = (options: LayoutOptions): FrameLayout => {
  const {first, second, viewport} = options
  const {width, height} = viewport
  const cover = options.fit === 'cover'
  const direction = cover || second === null ? null : getPairDirection({first, second, viewport})
  if (second === null || direction === null) {
    const scale = (cover ? Math.max : Math.min)(width / first.width, height / first.height)
    return {
      direction: null,
      first: {scale, x: width / 2, y: height / 2},
      height: first.height * scale,
      second: null,
      width: first.width * scale,
    }
  }
  const horizontal = direction === 'horizontal'
  const scale = horizontal ? height / first.height : width / first.width
  const secondScale = horizontal ? height / second.height : width / second.width
  const firstWidth = first.width * scale
  const firstHeight = first.height * scale
  const secondWidth = second.width * secondScale
  const secondHeight = second.height * secondScale
  const totalWidth = horizontal ? firstWidth + secondWidth : width
  const totalHeight = horizontal ? height : firstHeight + secondHeight
  const left = (width - totalWidth) / 2
  const top = (height - totalHeight) / 2
  return {
    direction,
    first: {scale, x: left + firstWidth / 2, y: top + firstHeight / 2},
    height: totalHeight,
    second: {
      scale: secondScale,
      x: horizontal ? left + firstWidth + secondWidth / 2 : width / 2,
      y: horizontal ? height / 2 : top + firstHeight + secondHeight / 2,
    },
    width: totalWidth,
  }
}
