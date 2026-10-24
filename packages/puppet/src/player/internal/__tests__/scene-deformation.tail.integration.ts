/** @vitest-environment jsdom */
import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetPart} from '../../document'

import {applySceneDeformers} from '../scene-deformation'
import {parseDocument} from '../../parse-document'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const tails = ['psd-4', 'psd-3', 'psd-2'].map((id) => model.parts.find((part) => part.id === id)!)

const renderTail = (part: PuppetPart, sway: number, yaw = 0, physics = 0) => {
  const values = {'full-body-x': yaw, 'tail-physics-x': physics, 'tail-sway': sway}
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

const triangleArea = (vertices: readonly number[], indices: readonly number[]) => {
  const [first, second, third] = indices.map((index) => index * 2)
  return (
    (vertices[second!]! - vertices[first!]!) * (vertices[third! + 1]! - vertices[first! + 1]!) -
    (vertices[second! + 1]! - vertices[first! + 1]!) * (vertices[third!]! - vertices[first!]!)
  )
}

describe('development model tail motion', () => {
  test.each([-22, 0, 22])(
    'should preserve idle, attachment and triangle orientation at yaw=%s',
    (yaw) => {
      for (const sway of [-1, -0.5, 0, 0.5, 1]) {
        for (const physics of [-1, -0.5, 0.5, 1]) {
          const distances = tails.map((part) => {
            const rest = renderTail(part, sway, yaw)
            const posed = renderTail(part, sway, yaw, physics)
            expect(posed.every(Number.isFinite)).toBe(true)
            for (let index = 0; index < part.mesh.vertices.length; index += 2) {
              if (part.mesh.vertices[index + 1]! >= 3197) {
                expect(posed[index]).toBeCloseTo(rest[index]!, 6)
                expect(posed[index + 1]).toBeCloseTo(rest[index + 1]!, 6)
              }
            }
            for (let index = 0; index < part.mesh.indices.length; index += 3) {
              const triangle = part.mesh.indices.slice(index, index + 3)
              const ratio = triangleArea(posed, triangle) / triangleArea(rest, triangle)
              expect(ratio).toBeGreaterThan(0.65)
              expect(ratio).toBeLessThan(1.4)
            }
            return Math.max(...posed.map((value, index) => Math.abs(value - rest[index]!)))
          })
          expect(distances[0]).toBeGreaterThan(10)
          expect(distances[1]).toBeGreaterThan(distances[0]!)
          expect(distances[2]).toBeGreaterThan(distances[1]!)
        }
      }
    },
  )

  test.each([-22, -11, 0, 11, 22])(
    'should retain attachment and triangle orientation at yaw=%s',
    (yaw) => {
      for (const part of tails) {
        const rest = renderTail(part, 0, yaw)
        for (const sway of [-1, -0.875, -0.5, -0.125, 0, 0.125, 0.5, 0.875, 1]) {
          const posed = renderTail(part, sway, yaw)
          expect(posed.every(Number.isFinite)).toBe(true)
          for (let index = 0; index < part.mesh.vertices.length; index += 2) {
            if (part.mesh.vertices[index + 1]! >= 3197) {
              expect(posed[index]).toBeCloseTo(rest[index]!, 6)
              expect(posed[index + 1]).toBeCloseTo(rest[index + 1]!, 6)
            }
          }
          for (let index = 0; index < part.mesh.indices.length; index += 3) {
            const triangle = part.mesh.indices.slice(index, index + 3)
            const ratio = triangleArea(posed, triangle) / triangleArea(rest, triangle)
            expect(ratio).toBeGreaterThan(0.7)
            expect(ratio).toBeLessThan(1.3)
          }
        }
      }
      expect(renderTail(tails[2]!, 0.5, yaw)).not.toEqual(renderTail(tails[2]!, 0, yaw))
    },
  )
})
