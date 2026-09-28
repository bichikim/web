/** @vitest-environment jsdom */
import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetPart} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

const renderArm = (
  part: PuppetPart,
  values: Readonly<Record<string, number>>,
  document = model,
) => {
  const vertices = [
    ...composeParameterVertices({
      document,
      parameterValues: values,
      partId: part.id,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...document, scene: composeParameterScene(document, values)},
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

describe('development model independent arm movement', () => {
  test.each([-30, 0, 30])(
    'should preserve shoulders and mesh orientation with arm movement at body yaw %s',
    (body) => {
      for (const full of [-22, 0, 22]) {
        for (const direction of [-1, 1]) {
          const values = {
            'arm-left-x': direction,
            'arm-right-x': -direction,
            'body-x': body,
            'full-body-x': full,
            'hand-left-curl': 1,
            'hand-right-curl': 1,
          }
          const baseline = {...values, 'arm-left-x': 0, 'arm-right-x': 0}
          for (const partId of [
            'psd-27',
            'psd-28',
            'psd-30',
            'psd-31',
            'psd-32',
            'psd-33',
            'psd-35',
            'psd-36',
            'psd-37',
            'psd-38',
          ]) {
            const part = model.parts.find((candidate) => candidate.id === partId)!
            const original = renderArm(part, baseline)
            const moved = renderArm(part, values)
            expect(moved.every(Number.isFinite)).toBe(true)
            part.mesh.vertices.forEach((coordinate, index) => {
              if (index % 2 === 1 && coordinate <= 2000) {
                expect(moved[index - 1]).toBeCloseTo(original[index - 1]!, 6)
                expect(moved[index]).toBeCloseTo(original[index]!, 6)
              }
            })
            const ratios = part.mesh.indices.flatMap((_, index, indices) => {
              if (index % 3 !== 0) {
                return []
              }
              const triangle = indices.slice(index, index + 3)
              return [triangleArea(moved, triangle) / triangleArea(original, triangle)]
            })
            expect(Math.min(...ratios), partId).toBeGreaterThan(0.6)
            expect(Math.max(...ratios), partId).toBeLessThan(1.4)
          }
        }
      }
    },
  )
})
