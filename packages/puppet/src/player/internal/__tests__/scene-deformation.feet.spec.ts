import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetPart} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const feet = [
  {partId: 'psd-9', ribbonId: 'psd-11', side: 'left'},
  {partId: 'psd-10', ribbonId: 'psd-12', side: 'right'},
]
const movementCases = feet.flatMap((foot) =>
  (['x', 'y'] as const).flatMap((axis) =>
    ([-1, 1] as const).map((value) => ({...foot, axis, value})),
  ),
)
const render = (part: PuppetPart, values: Readonly<Record<string, number>>) => {
  const vertices = [
    ...composeParameterVertices({
      document: model,
      parameterValues: values,
      partId: part.id,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...model, scene: composeParameterScene(model, values)},
    verticesByPartId: new Map([[part.id, vertices]]),
  })
  return vertices
}

describe('development model ankle-rooted feet', () => {
  test.each(feet)(
    'should expose independent neutral X and Y controls for $side foot',
    ({side, partId}) => {
      for (const axis of ['x', 'y']) {
        expect(
          model.parameters?.find((parameter) => parameter.id === `foot-${side}-${axis}`),
        ).toMatchObject({
          defaultValue: 0,
          maximum: 1,
          minimum: -1,
        })
      }
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const neutral = composeParameterVertices({
        document: model,
        parameterValues: {},
        partId,
        restVertices: part.mesh.vertices,
      })
      expect(neutral).toEqual(part.mesh.vertices)
    },
  )

  test.each(movementCases)(
    'should move $side toes on the $axis axis with value $value while keeping the ankle and other foot fixed',
    ({side, partId, ribbonId, axis, value}) => {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const other = model.parts.find(
        (candidate) => candidate.id === feet.find((foot) => foot.partId !== partId)!.partId,
      )!
      const original = render(part, {})
      const ribbon = model.parts.find((candidate) => candidate.id === ribbonId)!
      const ribbonRest = render(ribbon, {})
      const values = {[`foot-${side}-${axis}`]: value}
      const moved = render(part, values)
      const index = axis === 'x' ? 0 : 1
      const tips = part.mesh.vertices.flatMap((coordinate, position) =>
        position % 2 === 1 && coordinate > 6800 ? [position - 1] : [],
      )
      const offset =
        tips.reduce(
          (sum, position) => sum + moved[position + index]! - original[position + index]!,
          0,
        ) / tips.length
      expect(offset * value).toBeGreaterThan(35)
      expect(Math.abs(offset)).toBeLessThan(160)
      part.mesh.vertices.forEach((coordinate, position) => {
        if (position % 2 === 1 && coordinate <= 6100) {
          expect(moved[position - 1]).toBeCloseTo(original[position - 1]!, 8)
          expect(moved[position]).toBeCloseTo(original[position]!, 8)
        }
      })
      expect(render(other, values)).toEqual(render(other, {}))
      const ribbonMoved = render(ribbon, values)
      const ribbonOffset =
        ribbonMoved.reduce(
          (sum, coordinate, position) =>
            sum + (position % 2 === index ? coordinate - ribbonRest[position]! : 0),
          0,
        ) /
        (ribbonMoved.length / 2)
      expect(ribbonOffset * value).toBeGreaterThan(3)
    },
  )
})
