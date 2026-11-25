import type {PlayerViewCamera, PuppetViewport} from '@winter-love/puppet/player'

interface CoverCameraOptions {
  /** Logical dimensions of the Poffo document. */
  readonly viewport: PuppetViewport
  /** Visible host dimensions in CSS pixels. */
  readonly screen: PuppetViewport
  /** Anchor the crop at the top; omitted centers the image vertically. */
  readonly verticalAlign?: 'top' | 'center'
}

export const getCoverCamera = (options: CoverCameraOptions): PlayerViewCamera | null => {
  const {screen, viewport, verticalAlign} = options
  const dimensions = [screen.width, screen.height, viewport.width, viewport.height]
  if (!dimensions.every((size) => Number.isFinite(size) && size > 0)) {
    return null
  }
  const zoom = Math.max(screen.width / viewport.width, screen.height / viewport.height)
  if (!Number.isFinite(zoom) || zoom <= 0) {
    return null
  }
  return {
    x: (viewport.width - screen.width / zoom) / 2,
    y: verticalAlign === 'top' ? 0 : (viewport.height - screen.height / zoom) / 2,
    zoom,
  }
}
