import type {CameraSurface, TrackingViewport} from './types'
interface CanvasCameraSurfaceOptions {
  readonly bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
  readonly viewport: TrackingViewport | null
}
/** Projects canvas render bounds into its native monitor's normalized coordinates. */
export const canvasCameraSurface = ({
  bounds,
  viewport,
}: CanvasCameraSurfaceOptions): CameraSurface | null => {
  if (viewport === null) {
    return null
  }
  return {
    aspect: viewport.width / viewport.height,
    height: (bounds.height * viewport.scale) / viewport.height,
    left: (viewport.x + bounds.left * viewport.scale) / viewport.width,
    top: (viewport.y + bounds.top * viewport.scale) / viewport.height,
    width: (bounds.width * viewport.scale) / viewport.width,
  }
}
