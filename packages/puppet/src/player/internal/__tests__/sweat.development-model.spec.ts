import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const drops = [
  {distance: 60, partId: 'psd-95', side: 'upper'},
  {distance: 30, partId: 'psd-94', side: 'lower'},
]
const opacity = (partId: string, values: Readonly<Record<string, number>> = {}) =>
  composeParameterPartProperties({document: model, parameterValues: values, partId}).opacity

const render = (partId: string, values: Readonly<Record<string, number>>) => {
  const part = model.parts.find((candidate) => candidate.id === partId)!
  const vertices = [
    ...composeParameterVertices({
      document: model,
      parameterValues: values,
      partId,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...model, scene: composeParameterScene(model, values)},
    verticesByPartId: new Map([[partId, vertices]]),
  })
  return vertices
}

describe('development model sweat controls', () => {
  test('should hide both drops by default', () => {
    for (const {partId} of drops) {
      expect(opacity(partId)).toBe(0)
    }
  })

  test.each(drops)(
    'should fade $side independently from the other drop and flow',
    ({side, partId}) => {
      const other = drops.find((drop) => drop.side !== side)!
      for (const value of [0, 0.25, 0.5, 1]) {
        const values = {[`sweat-${side}-opacity`]: value, [`sweat-${side}-flow`]: 1}
        expect(opacity(partId, values)).toBeCloseTo(value, 8)
        expect(opacity(other.partId, values)).toBe(0)
        expect(render(other.partId, values)).toEqual(render(other.partId, {}))
      }
    },
  )

  test.each(drops)(
    'should slide $side downward without changing its shape',
    ({side, partId, distance}) => {
      const original = render(partId, {})
      for (const value of [0, 0.5, 1]) {
        const vertices = render(partId, {[`sweat-${side}-flow`]: value})
        vertices.forEach((coordinate, index) => {
          expect(coordinate - original[index]!).toBeCloseTo(
            index % 2 === 1 ? distance * value : 0,
            6,
          )
        })
      }
    },
  )

  test.each([-30, 0, 30])(
    'should retain independent fading and downward flow at face yaw %s',
    (yaw) => {
      const values = {'face-x': yaw, 'sweat-lower-opacity': 0.8, 'sweat-upper-opacity': 0.35}
      expect(opacity('psd-95', values)).toBeCloseTo(0.35, 8)
      expect(opacity('psd-94', values)).toBeCloseTo(0.8, 8)
      for (const {side, partId} of drops) {
        const original = render(partId, values)
        const flowed = render(partId, {...values, [`sweat-${side}-flow`]: 1})
        expect(flowed.every(Number.isFinite)).toBe(true)
        expect(
          flowed
            .filter((_, index) => index % 2 === 1)
            .every((y, index) => y > original[index * 2 + 1]!),
        ).toBe(true)
      }
    },
  )
})
