/** @vitest-environment jsdom */
import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'

import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model side hair spring', () => {
  test.each([
    {base: 600, group: 'side', partIds: ['psd-139', 'psd-140']},
    {base: 675, group: 'side-back', partIds: ['psd-129', 'psd-130']},
    {base: 600, group: 'rear', partIds: ['psd-17', 'psd-18']},
  ])(
    'should keep $group roots attached and bend its surfaces without folding',
    ({base, group, partIds}) => {
      for (const partId of partIds) {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const render = (values: Readonly<Record<string, number>>) => {
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
        const area = (vertices: ReadonlyArray<number>, triangle: number) => {
          const [a, b, c] = part.mesh.indices
            .slice(triangle, triangle + 3)
            .map((index) => index * 2)
          return (
            (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
            (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
          )
        }
        const poses = [-30, 0, 30].flatMap((yaw) => [-30, 0, 30].map((pitch) => ({pitch, yaw})))
        const bends = [-1.15, 1.15].flatMap((x) => [-1.15, 1.15].map((y) => ({x, y})))
        for (const {pitch, yaw} of poses) {
          const values = {'face-x': yaw, 'face-y': pitch}
          const neutral = render(values)
          for (const {x, y} of bends) {
            const vertices = render({
              ...values,
              [`hair-physics-${group}-x`]: x,
              [`hair-physics-${group}-y`]: y,
            })
            expect(vertices.every(Number.isFinite)).toBe(true)
            expect(
              vertices.some((coordinate, index) => Math.abs(coordinate - neutral[index]!) > 10),
            ).toBe(true)
            part.mesh.vertices.forEach((coordinate, index) => {
              if (index % 2 === 1 && coordinate <= base) {
                expect(vertices[index - 1]).toBe(neutral[index - 1])
                expect(vertices[index]).toBe(neutral[index])
              }
            })
            for (let triangle = 0; triangle < part.mesh.indices.length; triangle += 3) {
              expect(
                area(vertices, triangle) / area(neutral, triangle),
                `${partId} triangle ${triangle / 3}`,
              ).toBeGreaterThan(0.3)
            }
          }
        }
      }
    },
  )
})
