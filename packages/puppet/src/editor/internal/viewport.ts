import type {PuppetDocument} from '../../player/document'

export const EDITOR_VIEWPORT_PADDING = 0.25

export interface EditorViewBox {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export const getEditorViewBox = (document: PuppetDocument): EditorViewBox => ({
  height: document.viewport.height * (1 + EDITOR_VIEWPORT_PADDING * 2),
  width: document.viewport.width * (1 + EDITOR_VIEWPORT_PADDING * 2),
  x: -document.viewport.width * EDITOR_VIEWPORT_PADDING,
  y: -document.viewport.height * EDITOR_VIEWPORT_PADDING,
})
