import type {Container} from 'pixi.js'

import type {PlayerViewCamera} from '../view-camera'

import type {PuppetDocument} from '../document'

/** `layout` frames the document's default rectangle; `viewport` frames the whole document. */
export type PuppetFraming = 'layout' | 'viewport'

const CENTER = 0.5

/** Document coordinates to screen pixels: `screen = document · scale + offset`. */
export interface DocumentFit {
  readonly offset: {readonly x: number; readonly y: number}
  readonly scale: number
}

interface FitDocumentOptions {
  readonly document: PuppetDocument
  readonly framing?: PuppetFraming
  readonly screen: {
    readonly height: number
    readonly width: number
  }
  /** Space around the framed rectangle on each side, as a fraction of its size. */
  readonly viewportPadding?: number
}

/**
 * Fits the framed rectangle, grown by the padding, into the screen and places it by its
 * alignment (centered by default) along the axis with room to spare.
 */
export const fitDocument = (options: FitDocumentOptions): DocumentFit => {
  const padding = Math.max(0, options.viewportPadding ?? 0)
  const {layout, viewport} = options.document
  const rect =
    options.framing !== 'viewport' && layout !== undefined
      ? layout
      : {height: viewport.height, width: viewport.width, x: 0, y: 0}
  const [alignX, alignY] = rect === layout ? (layout.align ?? [CENTER, CENTER]) : [CENTER, CENTER]
  const paddedWidth = rect.width * (1 + padding * 2)
  const paddedHeight = rect.height * (1 + padding * 2)
  const scale = Math.min(options.screen.width / paddedWidth, options.screen.height / paddedHeight)
  /** The offset along one axis that puts the padded rectangle at its alignment. */
  const place = (
    axis: {screen: number; padded: number; size: number; start: number},
    align: number,
  ) => (axis.screen - axis.padded * scale) * align + (padding * axis.size - axis.start) * scale
  return {
    offset: {
      x: place(
        {padded: paddedWidth, screen: options.screen.width, size: rect.width, start: rect.x},
        alignX,
      ),
      y: place(
        {padded: paddedHeight, screen: options.screen.height, size: rect.height, start: rect.y},
        alignY,
      ),
    },
    scale,
  }
}

interface LayoutPlayerRootOptions extends FitDocumentOptions {
  /** Shows this document point and zoom instead of fitting the document. */
  readonly camera?: PlayerViewCamera
  readonly root: Container
}

export const layoutPlayerRoot = (options: LayoutPlayerRootOptions) => {
  if (options.camera !== undefined) {
    const {x, y, zoom} = options.camera
    options.root.scale.set(zoom)
    options.root.position.set(-x * zoom, -y * zoom)
    return
  }
  const {offset, scale} = fitDocument(options)
  options.root.scale.set(scale)
  options.root.position.set(offset.x, offset.y)
}
