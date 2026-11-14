import type {Container} from 'pixi.js'

import type {PlayerViewCamera} from '../view-camera'

import type {PuppetDocument} from '../document'

/** `layout` frames the document's default rectangle; `viewport` frames the whole document. */
export type PuppetFraming = 'layout' | 'viewport'

export type PuppetFit = 'contain' | 'cover'

const CENTER = 0.5

/** Document coordinates to screen pixels: `screen = document · scale + offset`. */
export interface DocumentFit {
  readonly offset: {readonly x: number; readonly y: number}
  readonly scale: number
}

interface FitDocumentOptions {
  /** Uniform sizing within the screen; omitted to show the whole framed rectangle. */
  readonly fit?: PuppetFit
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
 * Fits or fills the screen uniformly with the padded rectangle, using its alignment
 * (centered by default) to place spare space or crop overflow.
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
  const ratios = [options.screen.width / paddedWidth, options.screen.height / paddedHeight]
  const scale = options.fit === 'cover' ? Math.max(...ratios) : Math.min(...ratios)
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
