/** @vitest-environment jsdom */
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
const triangleArea = (vertices: ReadonlyArray<number>, triangle: ReadonlyArray<number>) => {
  const [a, b, c] = triangle.map((index) => index * 2)
  return (
    (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
    (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
  )
}

describe('development model ankle-rooted feet', () => {
  test.each(feet)(
    'should retain $side mesh orientation and leg anchoring with combined rotation',
    ({side, partId, ribbonId}) => {
      for (const yaw of [-22, 0, 22]) {
        for (const [x, y] of [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
          [0.35, -0.6],
        ]) {
          const base = {'body-lean': 8, 'full-body-x': yaw}
          const values = {...base, [`foot-${side}-x`]: x!, [`foot-${side}-y`]: y!}
          for (const id of [partId, ribbonId]) {
            const part = model.parts.find((candidate) => candidate.id === id)!
            const original = render(part, base)
            const moved = render(part, values)
            expect(moved.every(Number.isFinite)).toBe(true)
            part.mesh.vertices.forEach((coordinate, position) => {
              if (position % 2 === 1 && coordinate <= 6100) {
                expect(moved[position - 1]).toBeCloseTo(original[position - 1]!, 8)
                expect(moved[position]).toBeCloseTo(original[position]!, 8)
              }
            })
            for (let index = 0; index < part.mesh.indices.length; index += 3) {
              const triangle = part.mesh.indices.slice(index, index + 3)
              const ratio = triangleArea(moved, triangle) / triangleArea(original, triangle)
              expect(ratio).toBeGreaterThan(0.5)
              expect(ratio).toBeLessThan(1.4)
            }
          }
        }
      }
    },
  )
})
