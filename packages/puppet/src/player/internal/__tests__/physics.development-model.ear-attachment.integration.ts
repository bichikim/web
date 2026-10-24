import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {createPhysicsState, evaluatePhysics} from '../physics'
import {composeParameterVertices} from '../../../deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model ear physics', () => {
  test.each([
    {partIds: ['psd-132', 'psd-133', 'psd-134'], side: 'left'},
    {partIds: ['psd-136', 'psd-137', 'psd-138'], side: 'right'},
  ])('should hold the $side ear base while bending its upper surfaces', ({partIds, side}) => {
    const poses = [-30, 0, 30].flatMap((yaw) => [-30, 0, 30].map((pitch) => ({pitch, yaw})))
    const bends = [-1, 1].flatMap((x) => [-1, 1].map((y) => ({x, y})))
    const scenarios = partIds.flatMap((partId) =>
      poses.flatMap((pose) => bends.map((bend) => ({...pose, ...bend, partId}))),
    )
    for (const {partId, yaw, pitch, x, y} of scenarios) {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const options = {
        document: model,
        parameterValues: {'face-x': yaw, 'face-y': pitch},
        partId,
        restVertices: part.mesh.vertices,
      }
      const neutral = composeParameterVertices(options)
      const vertices = composeParameterVertices({
        ...options,
        parameterValues: {
          ...options.parameterValues,
          [`ear-physics-${side}-x`]: x,
          [`ear-physics-${side}-y`]: y,
        },
      })
      expect(vertices.some((coordinate, i) => Math.abs(coordinate - neutral[i]!) > 1)).toBe(true)
      for (let i = 0; i < vertices.length; i += 2) {
        if (part.mesh.vertices[i + 1]! >= 680) {
          expect(vertices[i]).toBe(neutral[i])
          expect(vertices[i + 1]).toBe(neutral[i + 1])
        }
      }
      const area = (points: ReadonlyArray<number>, triangle: number) => {
        const [a, b, c] = part.mesh.indices.slice(triangle, triangle + 3).map((i) => i * 2)
        return (
          (points[b!]! - points[a!]!) * (points[c! + 1]! - points[a! + 1]!) -
          (points[b! + 1]! - points[a! + 1]!) * (points[c!]! - points[a!]!)
        )
      }
      for (let i = 0; i < part.mesh.indices.length; i += 3) {
        expect(area(vertices, i) / area(neutral, i)).toBeGreaterThan(0.2)
      }
    }
  })
})
