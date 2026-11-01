import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import type {CursorPosition, TrackingPoint, TrackingViewport} from './types'
import {cursorResponse} from './cursor-response'

interface CursorTargetOptions {
  /** Canvas bounds in CSS pixels within its webview. */
  readonly bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
  /** Cursor and viewport dimensions in the native event's common coordinate unit. */
  readonly point: CursorPosition
  /** Current webview dimensions in CSS pixels, used to normalize native physical pixels. */
  readonly viewport: Pick<TrackingViewport, 'width' | 'height'>
  /** Face anchor within the canvas; omitted uses the default face position. */
  readonly options?: PoffoTrackingOptions
}
/** Preserves direction and eases into full gaze at one character height from the face. */
export const createCursorTarget = ({
  bounds,
  point,
  viewport,
  options,
}: CursorTargetOptions): TrackingPoint => {
  if (bounds.width <= 0 || bounds.height <= 0 || point.width <= 0 || point.height <= 0) {
    return {x: 0, y: 0}
  }
  const horizontal =
    (point.x * viewport.width) / point.width -
    bounds.left -
    bounds.width * (options?.faceX ?? DEFAULT_TRACKING_OPTIONS.faceX)
  const vertical =
    bounds.top +
    bounds.height * (options?.faceY ?? DEFAULT_TRACKING_OPTIONS.faceY) -
    (point.y * viewport.height) / point.height
  const distance = Math.hypot(horizontal, vertical)
  if (!Number.isFinite(distance) || distance === 0) {
    return {x: 0, y: 0}
  }
  const reach = options?.cursorReach ?? DEFAULT_TRACKING_OPTIONS.cursorReach
  const magnitude = cursorResponse(distance / (bounds.height * reach))
  return {x: (horizontal / distance) * magnitude, y: (vertical / distance) * magnitude}
}
