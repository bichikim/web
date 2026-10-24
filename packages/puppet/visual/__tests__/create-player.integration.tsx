import {afterEach, describe, expect, test} from 'vitest'

import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartRenderProperties,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'

const players: Array<Player> = []

const createPart = (
  id: string,
  color: string,
  properties: PuppetPartRenderProperties = {},
  width = 64,
): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices: [0, 0, 64, 0, 64, 64, 0, 64],
  },
  properties,
  texture: {
    height: 64,
    src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="${width}" height="64" fill="${color}"/></svg>`)}`,
    width: 64,
  },
})

const renderPixels = async (
  properties: PuppetPartRenderProperties,
  masks: ReadonlyArray<PuppetPart> = [
    createPart('mask', '#ffffff', {renderWhenUsedAsMask: false}, 32),
  ],
  options: {readonly resolution?: number; readonly resizeTo?: HTMLElement} = {},
) => {
  const model: PuppetDocument = {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts: [
      createPart('background', '#c8a078'),
      ...(properties.clippingMaskIds === undefined ? [] : masks),
      createPart('foreground', '#f08070', properties),
    ],
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: 64, width: 64},
  }
  const prepared = parseDocument(serializeDocument(model))
  if (!prepared.ok) {
    throw new Error('Invalid rendering fixture')
  }
  const canvas = document.createElement('canvas')
  const player = await createPlayer({
    canvas,
    document: prepared.document,
    resolution: 1,
    ...options,
  })
  players.push(player)
  player.pause()
  player.seek(0)
  const copy = document.createElement('canvas')
  copy.width = 64
  copy.height = 64
  const context = copy.getContext('2d')!
  const readPixels = () => {
    player.seek(0)
    context.clearRect(0, 0, 64, 64)
    context.drawImage(canvas, 0, 0, 64, 64)
    return {
      inside: Array.from(context.getImageData(16, 32, 1, 1).data),
      outside: Array.from(context.getImageData(48, 32, 1, 1).data),
    }
  }
  return {
    ...readPixels(),
    canvas,
    model,
    player,
    readPixels,
  }
}

afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
})

describe('createPlayer filtered blending', () => {
  test('should multiply clipped texture color against the scene instead of transparent black', async () => {
    const pixels = await renderPixels({blendMode: 'multiply', clippingMaskIds: ['mask']})

    expect(pixels.inside).toEqual([188, 80, 53, 255])
    expect(pixels.outside).toEqual([200, 160, 120, 255])
  })

  test.each([
    ['normal', [240, 128, 112, 255]],
    ['screen', [252, 208, 179, 255]],
    ['add', [255, 255, 232, 255]],
  ] as const)('should preserve clipped %s blending', async (blendMode, expected) => {
    const pixels = await renderPixels({blendMode, clippingMaskIds: ['mask']})

    expected.forEach((value, index) => expect(pixels.inside[index]).toBeCloseTo(value, -0.1))
    expect(pixels.outside).toEqual([200, 160, 120, 255])
  })

  test('should apply opacity once when compositing a clipped multiply layer', async () => {
    const pixels = await renderPixels({
      blendMode: 'multiply',
      clippingMaskIds: ['mask'],
      opacity: 0.5,
    })

    ;[194, 120, 87, 255].forEach((value, index) =>
      expect(Math.abs(pixels.inside[index]! - value)).toBeLessThanOrEqual(1),
    )
  })

  test.each([false, true])(
    'should blend color-adjusted textures after filtering with mask %s',
    async (clipped) => {
      const pixels = await renderPixels({
        blendMode: 'multiply',
        ...(clipped ? {clippingMaskIds: ['mask']} : {}),
        multiplyColor: [0.5, 1, 1],
        screenColor: [0.2, 0, 0],
      })

      expect(pixels.inside).toEqual([115, 80, 53, 255])
    },
  )

  test('should use alpha rather than mask RGB and preserve inverted clipping', async () => {
    const pixels = await renderPixels(
      {blendMode: 'multiply', clippingMaskIds: ['mask'], invertedMask: true},
      [createPart('mask', '#000000', {renderWhenUsedAsMask: false}, 32)],
    )

    expect(pixels.inside).toEqual([200, 160, 120, 255])
    expect(pixels.outside).toEqual([188, 80, 53, 255])
  })

  test('should union multiple alpha masks and keep visible mask sources in scene order', async () => {
    const pixels = await renderPixels(
      {blendMode: 'multiply', clippingMaskIds: ['mask', 'second']},
      [
        createPart('mask', '#000000', {renderWhenUsedAsMask: false}, 32),
        createPart('second', '#c8a078', {renderWhenUsedAsMask: true}),
      ],
    )

    expect(pixels.inside).toEqual([188, 80, 53, 255])
    expect(pixels.outside).toEqual([188, 80, 53, 255])
  })

  test('should refresh deformed mask vertices and blend changes without rebuilding the player', async () => {
    const result = await renderPixels({blendMode: 'multiply', clippingMaskIds: ['mask']})
    const update = (model: PuppetDocument) => {
      const prepared = parseDocument(serializeDocument(model))
      if (!prepared.ok) {
        throw new Error('Invalid updated fixture')
      }
      expect(result.player.updateDocument(prepared.document)).toBe(true)
      return result.readPixels()
    }
    const moved = {
      ...result.model,
      parts: result.model.parts.map((part) =>
        part.id === 'mask'
          ? {
              ...part,
              mesh: {
                ...part.mesh,
                vertices: part.mesh.vertices.map(
                  (value, index) => value + (index % 2 === 0 ? 32 : 0),
                ),
              },
            }
          : part,
      ),
    }

    expect(update(moved).inside).toEqual([200, 160, 120, 255])
    expect(result.readPixels().outside).toEqual([188, 80, 53, 255])
    const normal = {
      ...moved,
      parts: moved.parts.map((part) =>
        part.id === 'foreground'
          ? {...part, properties: {...part.properties, blendMode: 'normal' as const}}
          : part,
      ),
    }
    expect(update(normal).outside).toEqual([240, 128, 112, 255])
    expect(update(result.model).inside).toEqual([188, 80, 53, 255])
    const narrowed = {
      ...result.model,
      parts: result.model.parts.map((part) =>
        part.id === 'foreground'
          ? {
              ...part,
              mesh: {
                ...part.mesh,
                vertices: part.mesh.vertices.map((value, index) =>
                  index % 2 === 0 ? value / 8 : value,
                ),
              },
            }
          : part,
      ),
    }
    expect(update(narrowed).inside).toEqual([200, 160, 120, 255])
    expect(update(result.model).inside).toEqual([188, 80, 53, 255])
  })

  test('should apply nested inverse masks within the isolated blend layer', async () => {
    const pixels = await renderPixels({blendMode: 'multiply', clippingMaskIds: ['mask']}, [
      createPart('inner', '#000000', {renderWhenUsedAsMask: false}, 32),
      createPart('mask', '#ffffff', {
        clippingMaskIds: ['inner'],
        invertedMask: true,
        renderWhenUsedAsMask: false,
      }),
    ])

    expect(pixels.inside).toEqual([200, 160, 120, 255])
    expect(pixels.outside).toEqual([188, 80, 53, 255])
  })

  test('should preserve mask coordinates through resolution and viewport resize', async () => {
    let size = 64
    const host = document.createElement('div')
    Object.defineProperties(host, {
      clientHeight: {get: () => size},
      clientWidth: {get: () => size},
    })
    const result = await renderPixels(
      {blendMode: 'multiply', clippingMaskIds: ['mask']},
      undefined,
      {resizeTo: host, resolution: 2},
    )

    expect(result.canvas.width).toBe(128)
    expect(result.inside).toEqual([188, 80, 53, 255])
    size = 128
    result.player.resize()
    expect(result.canvas.width).toBe(256)
    expect(result.readPixels().inside).toEqual([188, 80, 53, 255])
    expect(result.readPixels().outside).toEqual([200, 160, 120, 255])
  })
})
