import {afterEach, describe, expect, test} from 'vitest'

import {packTextureAtlas, unpackTextureAtlas} from '../../src/editor/internal/texture-atlas-canvas'
import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'

/**
 * Texture atlas: packing every part image into one page must not change the picture, including
 * stretched images whose edge texels are filtered, and unpacking must give each image back.
 */

const WIDTH = 160
const HEIGHT = 80
// The 2D canvas stores premultiplied 8-bit colors, so re-encoding a translucent pixel into a
// page can move it by a few steps (measured: 3 on the antialiased stripe edge).
const TOLERANCE = 3

let player: Player | undefined

afterEach(() => {
  player?.destroy()
  player = undefined
  document.body.replaceChildren()
})

const canvas2d = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return {canvas, context: canvas.getContext('2d', {willReadFrequently: true})!}
}

/** Opaque gradient edges, a translucent stripe and a hue per image. */
const imageUrl = (width: number, height: number, hue: number) => {
  const {canvas, context} = canvas2d(width, height)
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, `hsl(${hue} 80% 40%)`)
  gradient.addColorStop(1, `hsl(${hue + 120} 70% 60%)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  context.clearRect(width / 3, 0, width / 6, height)
  context.fillStyle = `hsl(${hue + 60} 90% 50% / 0.5)`
  context.fillRect(width / 3, 0, width / 6, height)
  return canvas.toDataURL('image/png')
}

const part = (
  id: string,
  [x, y, width, height]: readonly [number, number, number, number],
  texture: readonly [number, number, number],
): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 1, 3, 2],
    uvs: [0, 0, 1, 0, 0, 1, 1, 1],
    vertices: [x, y, x + width, y, x, y + height, x + width, y + height],
  },
  texture: {
    height: texture[1],
    src: imageUrl(texture[0], texture[1], texture[2]),
    width: texture[0],
  },
})

const createDocument = (): PuppetDocument => {
  const parts = [
    part('exact', [8, 8, 40, 30], [40, 30, 0]),
    // Twice its texture size: bilinear samples reach the edge texels.
    part('stretched', [56, 8, 48, 64], [24, 32, 140]),
    part('small', [112, 40, 20, 20], [10, 10, 260]),
  ]
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts,
    scene: {
      roots: parts.map(({id}) => ({id, kind: 'part', locked: false, name: id, visible: true})),
    },
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: HEIGHT, width: WIDTH},
  }
}

const render = async (puppet: PuppetDocument) => {
  const parsed = parseDocument(JSON.stringify(puppet))
  if (!parsed.ok) {
    throw new Error(`invalid texture atlas fixture: ${parsed.error.code}`)
  }
  const canvas = document.createElement('canvas')
  player = await createPlayer({canvas, document: parsed.document, resolution: 1})
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  player.redraw()
  const {context} = canvas2d(WIDTH, HEIGHT)
  context.drawImage(canvas, 0, 0)
  player.destroy()
  player = undefined
  return context.getImageData(0, 0, WIDTH, HEIGHT).data
}

const pixels = async (src: string, width: number, height: number) => {
  const image = new Image()
  image.src = src
  await image.decode()
  const {context} = canvas2d(width, height)
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, width, height).data
}

const maximumDifference = (first: Uint8ClampedArray, second: Uint8ClampedArray) =>
  first.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - second[index]!)), 0)

describe('texture atlas', () => {
  test('should render the same picture from one atlas page and give each image back', async () => {
    const document = createDocument()
    const packed = await packTextureAtlas(document)
    expect(new Set(packed.parts.map(({texture}) => texture.src)).size).toBe(1)

    const expected = await render(document)
    const actual = await render(packed)
    expect(maximumDifference(actual, expected)).toBeLessThanOrEqual(TOLERANCE)

    const unpacked = await unpackTextureAtlas(packed)
    expect(unpacked.parts.map(({texture}) => texture.region)).toEqual([
      undefined,
      undefined,
      undefined,
    ])
    const differences = await Promise.all(
      unpacked.parts.map(async ({texture}, index) => {
        const original = document.parts[index]!.texture
        expect([texture.width, texture.height]).toEqual([original.width, original.height])
        const [restored, expected] = await Promise.all([
          pixels(texture.src, original.width, original.height),
          pixels(original.src, original.width, original.height),
        ])
        return maximumDifference(restored, expected)
      }),
    )
    expect(Math.max(...differences)).toBeLessThanOrEqual(TOLERANCE)
  })
})
