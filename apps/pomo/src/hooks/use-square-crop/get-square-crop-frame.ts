import {getContainedRect} from '@winter-love/utils/domain/geometry/get-contained-rect'
import type {Point, Size} from '@winter-love/utils/core/types/shared'
import type {SquareCropFrame} from './types'

export interface GetSquareCropFrameOptions {
  readonly image: Readonly<Size>
  readonly position: Point
  readonly viewport: Readonly<Size>
  readonly zoom: number
}

/**
 * Fits an image into the viewport and maps a normalized crop to its source pixels.
 * Returns null for non-finite zoom or zoom below 1.
 * Requires finite zoom >= 1 and finite position axes in [-1, 1].
 * Returns null for non-finite or non-positive image or viewport dimensions.
 */
export const getSquareCropFrame = (options: GetSquareCropFrameOptions): SquareCropFrame | null => {
  const {image, position, viewport, zoom} = options

  const contained = getContainedRect({container: viewport, content: image})
  if (contained === null) {
    return null
  }

  if (!Number.isFinite(zoom) || zoom < 1) {
    return null
  }

  const {height: imageHeight, scale, width: imageWidth, x: imageX, y: imageY} = contained
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
