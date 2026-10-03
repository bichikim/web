import type {SquareCropDimensions, SquareCropFrame, SquareCropPoint} from './types'

export interface GetSquareCropFrameOptions {
  readonly image: SquareCropDimensions
  readonly position: SquareCropPoint
  readonly viewport: SquareCropDimensions
  readonly zoom: number
}

const hasPositiveDimensions = (dimensions: SquareCropDimensions): boolean =>
  Number.isFinite(dimensions.width) &&
  dimensions.width > 0 &&
  Number.isFinite(dimensions.height) &&
  dimensions.height > 0

/**
 * Fits an image into the viewport and maps a normalized crop to its source pixels.
 * Requires finite zoom >= 1 and finite position axes in [-1, 1].
 * Returns null for non-finite or non-positive image or viewport dimensions.
 */
export const getSquareCropFrame = (options: GetSquareCropFrameOptions): SquareCropFrame | null => {
  const {image, position, viewport, zoom} = options

  if (!hasPositiveDimensions(image) || !hasPositiveDimensions(viewport)) {
    return null
  }

  const scale = Math.min(viewport.width / image.width, viewport.height / image.height)
  const imageWidth = image.width * scale
  const imageHeight = image.height * scale
  const imageX = (viewport.width - imageWidth) / 2
  const imageY = (viewport.height - imageHeight) / 2
  const maximumCropSize = Math.min(imageWidth, imageHeight)
  const cropSize = maximumCropSize / zoom
  const maxX = Math.max(0, (imageWidth - cropSize) / 2)
  const maxY = Math.max(0, (imageHeight - cropSize) / 2)
  const cropX = imageX + maxX + position.x * maxX
  const cropY = imageY + maxY + position.y * maxY

  return {
    cropSize,
    cropX,
    cropY,
    imageHeight,
    imageWidth,
    imageX,
    imageY,
    maximumCropSize,
    maxX,
    maxY,
    sourceSize: cropSize / scale,
    sourceX: (cropX - imageX) / scale,
    sourceY: (cropY - imageY) / scale,
  }
}
