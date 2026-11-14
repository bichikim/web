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
  if (options.screen.width <= 0 || options.screen.height <= 0) {
    return null
  }
  const zoom = Math.max(
    options.screen.width / options.viewport.width,
    options.screen.height / options.viewport.height,
  )
  return {
    x: (options.viewport.width - options.screen.width / zoom) / 2,
    y:
      options.verticalAlign === 'top'
        ? 0
        : (options.viewport.height - options.screen.height / zoom) / 2,
    zoom,
  }
}
