import {
  DEFAULT_TRACKING_OPTIONS,
  type PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import type {CursorPosition, TrackingPoint, TrackingViewport} from './types'

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
// App tuning: an offset of 0.3 character heights gives half the available movement.
const DEPTH_RATIO = 0.3

/** Preserves the target direction while its distance approaches full gaze through an atan curve. */
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
  // A virtual depth relative to character height keeps the response consistent when resized.
  const depth = bounds.height * DEPTH_RATIO
  const magnitude = Math.atan2(distance, depth) / (Math.PI / 2)
  return {x: (horizontal / distance) * magnitude, y: (vertical / distance) * magnitude}
}
