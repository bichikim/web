import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetPart,
  type PuppetPartRenderProperties,
  type PuppetSceneNode,
} from '../../../src/player/document'

/** Document builders and textures for the rendering experiment. */

export type Rgba = readonly [number, number, number, number]
export type Rect = readonly [number, number, number, number]

export const SWATCH = 32
export const GAP = 8

export const canvas2d = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return {canvas, context: canvas.getContext('2d', {willReadFrequently: true})!}
}

export const pngUrl = (
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) => {
  const {canvas, context} = canvas2d(width, height)
  draw(context)
  return canvas.toDataURL('image/png')
}

const SOLID_SIZE = 4
// Corners top left, top right, bottom left, bottom right; two triangles.
const BOTTOM_RIGHT = 3
const QUAD_INDICES = [0, 1, 2, 1, BOTTOM_RIGHT, 2]

export const solid = ([red, green, blue, alpha]: Rgba) =>
  pngUrl(SOLID_SIZE, SOLID_SIZE, (context) => {
    context.fillStyle = `rgba(${red},${green},${blue},${alpha})`
    context.fillRect(0, 0, SOLID_SIZE, SOLID_SIZE)
  })

/** A two-axis gradient, so each swatch covers many color pairs. */
export const gradient = (from: string, to: string, shade: string) =>
  pngUrl(SWATCH, SWATCH, (context) => {
    const horizontal = context.createLinearGradient(0, 0, SWATCH, 0)
    horizontal.addColorStop(0, from)
    horizontal.addColorStop(1, to)
    context.fillStyle = horizontal
    context.fillRect(0, 0, SWATCH, SWATCH)
    const vertical = context.createLinearGradient(0, 0, 0, SWATCH)
    vertical.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
    vertical.addColorStop(1, shade)
    context.fillStyle = vertical
    context.fillRect(0, 0, SWATCH, SWATCH)
  })

const group = (
  id: string,
  children: ReadonlyArray<PuppetSceneNode>,
  properties?: PuppetGroupRenderProperties,
): PuppetSceneNode => ({
  children,
  id,
  kind: 'group',
  locked: false,
  name: id,
  properties,
  visible: true,
})

/** Collects parts and scene nodes for one experiment document. */
export const createBuilder = () => {
  const parts: Array<PuppetPart> = []
  const part = (
    id: string,
    [x, y, width, height]: Rect,
    src: string,
    properties?: PuppetPartRenderProperties,
  ): PuppetSceneNode => {
    parts.push({
      id,
      mesh: {
        indices: QUAD_INDICES,
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        vertices: [x, y, x + width, y, x, y + height, x + width, y + height],
      },
      properties,
      texture: {height: SWATCH, src, width: SWATCH},
    })
    return {id, kind: 'part', locked: false, name: id, visible: true}
  }
  const document = (
    roots: ReadonlyArray<PuppetSceneNode>,
    width: number,
    height: number,
  ): PuppetDocument => ({
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts,
    scene: {roots},
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height, width},
  })
  return {document, group, part}
}

export const cell = (column: number, row: number, size = SWATCH): Rect => [
  GAP + column * (SWATCH + GAP),
  GAP + row * (SWATCH + GAP),
  size,
  size,
]

export const quad = ([x, y, width, height]: Rect, dx = 0, dy = 0) => [
  x + dx,
  y + dy,
  x + width + dx,
  y,
  x,
  y + height,
  x + width,
  y + height - dy,
]
