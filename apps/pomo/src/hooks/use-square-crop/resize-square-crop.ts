import type {
  SquareCropFrame,
  SquareCropPoint,
  SquareCropResizeHandle,
  SquareCropSelection,
  SquareCropZoomLimits,
} from './types'

export interface ResizeSquareCropOptions {
  readonly frame: SquareCropFrame
  readonly handle: SquareCropResizeHandle
  readonly pointer: SquareCropPoint
  readonly zoomLimits: SquareCropZoomLimits
}

type ResizeDirection = -1 | 0 | 1

interface ResizeAnchors extends SquareCropPoint {
  readonly horizontal: ResizeDirection
  readonly maximumSize: number
  readonly vertical: ResizeDirection
}

const getAxisAnchor = (direction: ResizeDirection, start: number, end: number): number =>
  direction < 0 ? end : direction > 0 ? start : (start + end) / 2

const getAxisAvailableSize = (
  direction: ResizeDirection,
  anchor: number,
  start: number,
  end: number,
): number =>
  direction < 0
    ? anchor - start
    : direction > 0
      ? end - anchor
      : 2 * Math.min(anchor - start, end - anchor)

const getResizeAnchors = (
  frame: SquareCropFrame,
  handle: SquareCropResizeHandle,
): ResizeAnchors => {
  const left = frame.cropX
  const top = frame.cropY
  const right = left + frame.cropSize
  const bottom = top + frame.cropSize
  const imageRight = frame.imageX + frame.imageWidth
  const imageBottom = frame.imageY + frame.imageHeight
  const horizontal = handle.includes('west') ? -1 : handle.includes('east') ? 1 : 0
  const vertical = handle.includes('north') ? -1 : handle.includes('south') ? 1 : 0
  const x = getAxisAnchor(horizontal, left, right)
  const y = getAxisAnchor(vertical, top, bottom)

  return {
    horizontal,
    maximumSize: Math.min(
      getAxisAvailableSize(horizontal, x, frame.imageX, imageRight),
      getAxisAvailableSize(vertical, y, frame.imageY, imageBottom),
    ),
    vertical,
    x,
    y,
  }
}

const getCandidateSize = (anchors: ResizeAnchors, pointer: SquareCropPoint): number => {
  const horizontalSize =
    anchors.horizontal === 0 ? null : (pointer.x - anchors.x) * anchors.horizontal
  const verticalSize = anchors.vertical === 0 ? null : (pointer.y - anchors.y) * anchors.vertical

  return Math.max(
    0,
    horizontalSize ?? Number.NEGATIVE_INFINITY,
    verticalSize ?? Number.NEGATIVE_INFINITY,
  )
}

const getResizeOrigin = (direction: ResizeDirection, anchor: number, size: number): number =>
  direction < 0 ? anchor - size : direction > 0 ? anchor : anchor - size / 2

/** Resizes a square around its opposite anchor within the image and zoom limits. */
export const resizeSquareCrop = (options: ResizeSquareCropOptions): SquareCropSelection => {
  const {frame, handle, pointer, zoomLimits} = options
  const anchors = getResizeAnchors(frame, handle)
  const maximumSize = Math.min(anchors.maximumSize, frame.maximumCropSize / zoomLimits.minimum)
  const minimumSize = Math.min(frame.maximumCropSize / zoomLimits.maximum, maximumSize)
  const size = Math.min(maximumSize, Math.max(minimumSize, getCandidateSize(anchors, pointer)))

  return {
    size,
    x: getResizeOrigin(anchors.horizontal, anchors.x, size),
    y: getResizeOrigin(anchors.vertical, anchors.y, size),
  }
}
