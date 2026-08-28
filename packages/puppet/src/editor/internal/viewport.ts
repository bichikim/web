import type {PuppetDocument} from '../../player/document'

export const EDITOR_VIEWPORT_PADDING = 0.25

export interface EditorViewBox {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export interface EditorBounds {
  readonly height: number
  readonly left: number
  readonly top: number
  readonly width: number
}

export interface EditorPoint {
  readonly x: number
  readonly y: number
}

export interface GetEditorPointOptions {
  readonly bounds: EditorBounds
  readonly clientPoint: EditorPoint
  readonly viewBox: EditorViewBox
}

export const getEditorViewBox = (document: PuppetDocument): EditorViewBox => ({
  height: document.viewport.height * (1 + EDITOR_VIEWPORT_PADDING * 2),
  width: document.viewport.width * (1 + EDITOR_VIEWPORT_PADDING * 2),
  x: -document.viewport.width * EDITOR_VIEWPORT_PADDING,
  y: -document.viewport.height * EDITOR_VIEWPORT_PADDING,
})

export const getEditorPoint = (options: GetEditorPointOptions): EditorPoint => {
  const scale = Math.min(
    options.bounds.width / options.viewBox.width,
    options.bounds.height / options.viewBox.height,
  )
  const horizontalOffset = (options.bounds.width - options.viewBox.width * scale) / 2
  const verticalOffset = (options.bounds.height - options.viewBox.height * scale) / 2

  return {
    x: (options.clientPoint.x - options.bounds.left - horizontalOffset) / scale + options.viewBox.x,
    y: (options.clientPoint.y - options.bounds.top - verticalOffset) / scale + options.viewBox.y,
  }
}
