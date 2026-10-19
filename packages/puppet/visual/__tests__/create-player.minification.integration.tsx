import {afterEach, describe, expect, test} from 'vitest'
import {createPlayer, type Player} from '../../src/player/create-player'
import {createEmptyDocument} from '../../src/player/create-empty-document'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'
import type {PuppetPartRenderProperties} from '../../src/player/document'

const players: Player[] = []

interface FilterCase {
  readonly name: string
  readonly properties: PuppetPartRenderProperties
}

const createPattern = (size: number, colorAt: (x: number, y: number) => number) => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  for (let index = 0; index < size * size; index += 1) {
    const color = colorAt(index % size, Math.floor(index / size))
    image.data.set([color, color, color, 255], index * 4)
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
})

describe('createPlayer texture minification', () => {
  test.each([512, 510])(
    'should average fine texture detail when shrinking a %i pixel image and resizing the viewport',
    async (size) => {
      const prepared = parseDocument(
        serializeDocument({
          ...createEmptyDocument(),
          parts: [
            {
              id: 'pattern',
              mesh: {
                indices: [0, 1, 2, 0, 2, 3],
                uvs: [0, 0, 1, 0, 1, 1, 0, 1],
                vertices: [0, 0, size, 0, size, size, 0, size],
              },
              texture: {
                height: size,
                src: createPattern(size, (x, y) => ((x + y) % 2 === 0 ? 0 : 255)),
                width: size,
              },
            },
          ],
          scene: undefined,
          viewport: {height: size, width: size},
        }),
      )
      if (!prepared.ok) {
        throw new Error('Invalid texture minification fixture')
      }
      let viewport = 31
      const host = document.createElement('div')
      Object.defineProperties(host, {
        clientHeight: {get: () => viewport},
        clientWidth: {get: () => viewport},
      })
      const canvas = document.createElement('canvas')
      const copy = document.createElement('canvas')
      const context = copy.getContext('2d')!
      const player = await createPlayer({
        canvas,
        document: prepared.document,
        onAfterRender: () => {
          copy.width = canvas.width
          copy.height = canvas.height
          context.drawImage(canvas, 0, 0)
        },
        resizeTo: host,
        resolution: 1,
      })
      players.push(player)
      player.pause()
      for (const nextSize of [31, 43, 15]) {
        viewport = nextSize
        player.resize()
        expect(canvas.width).toBe(viewport)
        const pixels = context.getImageData(2, 2, viewport - 4, viewport - 4).data
        const colors = Array.from(pixels).filter((_, index) => index % 4 !== 3)
        const alphas = Array.from(pixels).filter((_, index) => index % 4 === 3)
        expect(Math.min(...colors)).toBeGreaterThanOrEqual(125)
        expect(Math.max(...colors)).toBeLessThanOrEqual(130)
        expect(Math.min(...alphas)).toBe(255)
      }
    },
  )
  test.each([
    {name: 'color adjustment', properties: {multiplyColor: [0.8, 1, 1]}},
    {name: 'clipping', properties: {clippingMaskIds: ['mask']}},
    {
      name: 'color adjustment with clipping',
      properties: {clippingMaskIds: ['mask'], multiplyColor: [0.8, 1, 1]},
    },
    {name: 'nested clipping', properties: {clippingMaskIds: ['nested']}},
  ] satisfies ReadonlyArray<FilterCase>)(
    'should preserve visible one-pixel stripes through $name at Retina resolution',
    async ({properties}) => {
      const size = 512
      const mesh = {
        indices: [0, 1, 2, 0, 2, 3],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1],
        vertices: [0, 0, size, 0, size, size, 0, size],
      }
      const mask = {
        id: 'mask',
        mesh,
        properties: {renderWhenUsedAsMask: false},
        texture: {height: size, src: createPattern(size, () => 255), width: size},
      }
      const prepared = parseDocument(
        serializeDocument({
          ...createEmptyDocument(),
          parts: [
            mask,
            {...mask, id: 'nested', properties: {...mask.properties, clippingMaskIds: ['mask']}},
            {
              id: 'stripes',
              mesh,
              properties,
              texture: {
                height: size,
                src: createPattern(size, (x) => (Math.floor(x / 4) % 2 === 0 ? 0 : 255)),
                width: size,
              },
            },
          ],
          scene: undefined,
          viewport: {height: size, width: size},
        }),
      )
      if (!prepared.ok) {
        throw new Error('Invalid Retina detail fixture')
      }
      const host = document.createElement('div')
      Object.defineProperties(host, {clientHeight: {value: 64}, clientWidth: {value: 64}})
      const canvas = document.createElement('canvas')
      const copy = document.createElement('canvas')
      copy.width = 128
      copy.height = 128
      const context = copy.getContext('2d')!
      const player = await createPlayer({
        canvas,
        document: prepared.document,
        onAfterRender: () => context.drawImage(canvas, 0, 0),
        resizeTo: host,
        resolution: 2,
      })
      players.push(player)
      player.pause()
      player.redraw()
      const pixels = context.getImageData(16, 64, 96, 1).data
      const green = Array.from(pixels).filter((_, index) => index % 4 === 1)
      expect(Math.min(...green)).toBeLessThanOrEqual(5)
      expect(Math.max(...green)).toBeGreaterThanOrEqual(250)
      expect(green.every((value, index) => (index % 2 === 0 ? value <= 5 : value >= 250))).toBe(
        true,
      )
    },
  )
})
