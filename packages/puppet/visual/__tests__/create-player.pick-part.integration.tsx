import {afterEach, expect, test} from 'vitest'
import {createPlayer, type Player} from '../../src/player/create-player'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'
import type {PuppetDocument, PuppetPart} from '../../src/player/document'

const players: Player[] = []
const part = (id: string, width = 64): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices: [0, 0, 64, 0, 64, 64, 0, 64],
  },
  texture: {
    height: 64,
    src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="${width}" height="64" fill="red"/></svg>`)}`,
    width: 64,
  },
})
const setup = async (parts: readonly PuppetPart[], scene?: PuppetDocument['scene']) => {
  const prepared = parseDocument(
    serializeDocument({
      format: 'winter-love-poffo',
      motions: [],
      parts,
      scene,
      version: 1,
      viewport: {height: 64, width: 64},
    }),
  )
  if (!prepared.ok) {
    throw new Error('Invalid picker fixture')
  }
  const canvas = document.createElement('canvas')
  const player = await createPlayer({canvas, document: prepared.document, resolution: 1})
  players.push(player)
  player.pause()
  player.seek(0)
  return player
}
afterEach(() => players.splice(0).forEach((player) => player.destroy()))

test('should select the frontmost painted texel and skip transparent or hidden parts', async () => {
  const player = await setup([part('back'), part('front', 32)])
  expect(player.pickPart({x: 16, y: 32})).toBe('front')
  expect(player.pickPart({x: 48, y: 32})).toBe('back')
  expect(player.pickPart({x: 70, y: 32})).toBeUndefined()
  player.setPartOverride('front', {opacity: 0})
  expect(player.pickPart({x: 16, y: 32})).toBe('back')
})

test.each([false, true])(
  'should respect clipping masks with inversion %s',
  async (invertedMask) => {
    const player = await setup([
      part('back'),
      {...part('mask', 32), properties: {renderWhenUsedAsMask: false}},
      {...part('front'), properties: {clippingMaskIds: ['mask'], invertedMask}},
    ])
    expect(player.pickPart({x: 16, y: 32})).toBe(invertedMask ? 'back' : 'front')
    expect(player.pickPart({x: 48, y: 32})).toBe(invertedMask ? 'front' : 'back')
  },
)

test('should skip transparent scene layers', async () => {
  const player = await setup([part('back'), part('front')], {
    roots: [
      {id: 'back', kind: 'part', locked: false, name: 'Back', visible: true},
      {
        children: [{id: 'front', kind: 'part', locked: false, name: 'Front', visible: true}],
        id: 'layer',
        kind: 'group',
        locked: false,
        name: 'Layer',
        properties: {offscreen: true, opacity: 0},
        visible: true,
      },
    ],
  })
  expect(player.pickPart({x: 16, y: 32})).toBe('back')
})
