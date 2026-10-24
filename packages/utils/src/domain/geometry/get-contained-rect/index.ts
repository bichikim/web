import type {Rect, Size} from 'src/core/types/shared'

export interface GetContainedRectOptions {
  readonly content: Readonly<Size>
  readonly container: Readonly<Size>
}

export interface ContainedRect extends Readonly<Rect> {
  readonly scale: number
}

const hasPositiveSize = (size: Readonly<Size>): boolean =>
  Number.isFinite(size.width) && size.width > 0 && Number.isFinite(size.height) && size.height > 0

/**
 * Fits and centers a rectangle inside a container with uniform scaling, including upscaling.
 * Returns null for non-finite or non-positive content or container dimensions.
 */
export const getContainedRect = (options: GetContainedRectOptions): ContainedRect | null => {
  const {content, container} = options
  if (!hasPositiveSize(content) || !hasPositiveSize(container)) {
    return null
  }

  const scale = Math.min(container.width / content.width, container.height / content.height)
  const width = content.width * scale
  const height = content.height * scale

  return {
    height,
    scale,
    width,
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
  }
}
