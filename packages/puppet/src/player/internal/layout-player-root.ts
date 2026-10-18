import type {PlayerViewCamera} from '../view-camera'
import type {Container} from 'pixi.js'

import type {PuppetDocument} from '../document'

const VIEWPORT_PADDING = 1

interface LayoutPlayerRootOptions {
  readonly camera?: PlayerViewCamera
  readonly document: PuppetDocument
  readonly root: Container
  readonly screen: {
    readonly height: number
    readonly width: number
  }
  readonly viewportPadding?: number
}

export const layoutPlayerRoot = (options: LayoutPlayerRootOptions) => {
  if (options.camera !== undefined) {
    const {x, y, zoom} = options.camera
    options.root.scale.set(zoom)
    options.root.position.set(-x * zoom, -y * zoom)
    return
  }
  const viewportPadding = Math.max(0, options.viewportPadding ?? 0)
  const viewportWidth = options.document.viewport.width * (1 + viewportPadding * 2)
  const viewportHeight = options.document.viewport.height * (1 + viewportPadding * 2)
  const scale =
    Math.min(options.screen.width / viewportWidth, options.screen.height / viewportHeight) *
    VIEWPORT_PADDING

  options.root.scale.set(scale)
  options.root.position.set(
    (options.screen.width - options.document.viewport.width * scale) / 2,
    (options.screen.height - options.document.viewport.height * scale) / 2,
  )
}
