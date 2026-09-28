import {afterEach, describe, expect, test} from 'vitest'

import modelSource from '../../examples/development-model.json?raw'
import {createPlayer, type Player} from '../../src/player/create-player'
import type {PuppetDocument, PuppetPart} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {getScenePartStates} from '../../src/player/scene'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const arms = [
  'psd-27',
  'psd-30',
  'psd-31',
  'psd-32',
  'psd-33',
  'psd-28',
  'psd-35',
  'psd-36',
  'psd-37',
  'psd-38',
]
const skirt = ['psd-6', 'psd-7', 'psd-41', 'psd-42', 'psd-43']
const players: Array<Player> = []

const createProbe = (id: string): PuppetPart => {
  const armColumn = arms.indexOf(id)
  const skirtRow = skirt.indexOf(id)
  const cells =
    armColumn >= 0
      ? skirt.map((_, row) => ({column: armColumn, row}))
      : arms.map((_, column) => ({column, row: skirtRow}))
  const color = armColumn >= 0 ? '#ff0000' : '#0000ff'
  return {
    id,
    mesh: {
      indices: cells.flatMap((_, index) => [0, 1, 2, 0, 2, 3].map((vertex) => vertex + index * 4)),
      uvs: cells.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 1]),
      vertices: cells.flatMap(({column, row}) => {
        const x = column * 16 + 2
        const y = row * 16 + 2
        return [x, y, x + 12, y, x + 12, y + 12, x, y + 12]
      }),
    },
    texture: {
      height: 1,
      src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${color}"/></svg>`)}`,
      width: 1,
    },
  }
}

afterEach(() => players.splice(0).forEach((player) => player.destroy()))

describe('createPlayer development model layer order', () => {
  test.each(['body-x', 'full-body-x'])(
    'should paint every hand and sleeve in front of or behind all skirt surfaces at %s thresholds',
    async (parameterId) => {
      const states = getScenePartStates(model).filter(({partId}) =>
        [...arms, ...skirt].includes(partId),
      )
      const probe: PuppetDocument = {
        format: model.format,
        layerOrderRules: model.layerOrderRules,
        motions: [],
        parameters: model.parameters,
        parts: states.map(({partId}) => createProbe(partId)),
        version: model.version,
        viewport: {height: 80, width: 160},
      }
      const prepared = parseDocument(JSON.stringify(probe))
      if (!prepared.ok) {
        throw new Error('Invalid layer overlap probe')
      }
      const canvas = document.createElement('canvas')
      const player = await createPlayer({canvas, document: prepared.document, resolution: 1})
      players.push(player)
      player.pause()
      player.setPhysicsPreview(false)
      const copy = document.createElement('canvas')
      copy.width = 160
      copy.height = 80
      const context = copy.getContext('2d')!

      const limit = parameterId === 'full-body-x' ? 22 : 30
      for (const value of [0, 15, -15, 15.1, -15.1, limit, -limit, 0]) {
        player.setParameterValues({[parameterId]: value})
        player.seek(0)
        context.clearRect(0, 0, 160, 80)
        context.drawImage(canvas, 0, 0)
        arms.forEach((armId, column) => {
          skirt.forEach((skirtId, row) => {
            const armInFront = Math.abs(value) <= 15 || (value > 0 ? column < 5 : column >= 5)
            const pixel = Array.from(context.getImageData(column * 16 + 8, row * 16 + 8, 1, 1).data)
            expect(pixel, `${parameterId}=${value}: ${armId} overlaps ${skirtId}`).toEqual(
              armInFront ? [255, 0, 0, 255] : [0, 0, 255, 255],
            )
          })
        })
      }
    },
  )
})
