import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {createPhysicsState, evaluatePhysics} from '../physics'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model hanging chest ribbons', () => {
  test.each([
    {partId: 'psd-47', side: 'left'},
    {partId: 'psd-48', side: 'right'},
  ])(
    'should pin $side attachment while the ribbon bends with yaw and breathing',
    ({partId, side}) => {
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
        const [a, b, c] = part.mesh.indices.slice(triangle, triangle + 3).map((index) => index * 2)
        return (
          (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
          (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
        )
      }
      const poses = [-30, 0, 30].flatMap((body) => [-22, 0, 22].map((full) => ({body, full})))
      const bends = [-1, 1].flatMap((body) => [-1, 1].map((full) => ({body, full})))
      for (const pose of poses) {
        const values = {'body-x': pose.body, breath: 1, 'full-body-x': pose.full}
        const neutral = render(values)
        for (const bend of bends) {
          const vertices = render({
            ...values,
            [`ribbon-physics-${side}-body-x`]: bend.body,
            [`ribbon-physics-${side}-full-body-x`]: bend.full,
          })
          expect(vertices.every(Number.isFinite)).toBe(true)
          part.mesh.vertices.forEach((coordinate, index) => {
            if (index % 2 === 1 && coordinate <= 2090) {
              expect(vertices[index - 1]).toBe(neutral[index - 1])
              expect(vertices[index]).toBe(neutral[index])
            }
          })
          const distances = vertices
            .filter((_, index) => index % 2 === 0)
            .map((x, index) =>
              Math.hypot(
                x - neutral[index * 2]!,
                vertices[index * 2 + 1]! - neutral[index * 2 + 1]!,
              ),
            )
          if (bend.body === bend.full) {
            expect(Math.max(...distances)).toBeGreaterThan(20)
          }
          expect(Math.max(...distances)).toBeLessThan(110)
          for (let triangle = 0; triangle < part.mesh.indices.length; triangle += 3) {
            expect(area(vertices, triangle) / area(neutral, triangle)).toBeGreaterThan(0.6)
          }
        }
      }
    },
  )
})
