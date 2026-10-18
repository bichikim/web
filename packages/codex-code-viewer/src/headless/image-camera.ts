export interface ImagePoint {
  readonly x: number
  readonly y: number
}
export interface ImageSize {
  readonly height: number
  readonly width: number
}
export type ImageCamera =
  | {readonly mode: 'fit'}
  | ({readonly mode: 'zoom'; readonly scale: number} & ImagePoint)
export interface ImageView extends ImagePoint, ImageSize {
  readonly scale: number
}
export const MIN_IMAGE_PERCENT = 1
export const MAX_IMAGE_PERCENT = 1600
const PERCENT = 100
const position = (value: number, available: number, size: number): number =>
  size <= available ? (available - size) / 2 : Math.min(0, Math.max(available - size, value))

/** Resolves a camera to bounded image placement without upscaling fit mode. */
export const imageView = (input: {
  readonly camera: ImageCamera
  readonly natural: ImageSize
  readonly viewport: ImageSize
}): ImageView => {
  const {camera, natural, viewport} = input
  const fitting =
    natural.width > 0 && natural.height > 0 && viewport.width > 0 && viewport.height > 0
      ? Math.min(1, viewport.width / natural.width, viewport.height / natural.height)
      : 1
  const scale = camera.mode === 'fit' ? fitting : camera.scale
  const width = natural.width * scale
  const height = natural.height * scale
  return {
    height,
    scale,
    width,
    x: position(camera.mode === 'fit' ? 0 : camera.x, viewport.width, width),
    y: position(camera.mode === 'fit' ? 0 : camera.y, viewport.height, height),
  }
}

/** Produces a bounded zoom camera around a viewport point. */
export const zoomImage = (input: {
  readonly current: ImageView
  readonly percent: number
  readonly anchor: ImagePoint
}): ImageCamera => {
  const {current, percent, anchor} = input
  const scale = Math.min(MAX_IMAGE_PERCENT, Math.max(MIN_IMAGE_PERCENT, percent)) / PERCENT
  return {
    mode: 'zoom',
    scale,
    x: anchor.x - ((anchor.x - current.x) * scale) / current.scale,
    y: anchor.y - ((anchor.y - current.y) * scale) / current.scale,
  }
}
