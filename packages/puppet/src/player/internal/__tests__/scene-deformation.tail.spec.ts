import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetPart} from '../../document'
import {sampleMotionParameterValues} from '../motion'
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

  test('should expose an independent centered tail control in a valid model', () => {
    expect(model.parameters?.find((parameter) => parameter.id === 'tail-sway')).toMatchObject({
      defaultValue: 0,
      maximum: 1,
      minimum: -1,
    })
    expect(model.parameterBindings?.find((binding) => binding.id === 'tail-sway')).toMatchObject({
      parameterIds: ['tail-sway'],
      targetPartIds: ['psd-2', 'psd-3', 'psd-4'],
    })
  })

  test('should increase movement from root to tip and give the tail depth and lift', () => {
    for (const sway of [-1, 1]) {
      const distances = tails.map((part) => {
        const rest = renderTail(part, 0)
        const posed = renderTail(part, sway)
        const horizontal = posed
          .filter((_, index) => index % 2 === 0)
          .map((value, index) => value - rest[index * 2]!)
        const vertical = posed
          .filter((_, index) => index % 2 === 1)
          .map((value, index) => value - rest[index * 2 + 1]!)
        expect(Math.max(...vertical) - Math.min(...vertical)).toBeGreaterThan(5)
        return horizontal.reduce((total, value) => total + Math.abs(value), 0) / horizontal.length
      })
      expect(distances[0]).toBeGreaterThan(5)
      expect(distances[1]).toBeGreaterThan(distances[0]!)
      expect(distances[2]).toBeGreaterThan(distances[1]!)
      expect(distances[2]).toBeGreaterThan(80)
    }
    const tip = tails[2]!
    const row = tip.mesh.vertices.flatMap((value, index) =>
      index % 2 === 1 && value === 403 ? [index - 1] : [],
    )
    const width = (sway: number) => {
      const vertices = renderTail(tip, sway)
      const coordinates = row.map((index) => vertices[index]!)
      return Math.max(...coordinates) - Math.min(...coordinates)
    }
    expect(width(-1)).toBeLessThan(width(0) * 0.97)
    expect(width(1)).toBeGreaterThan(width(0) * 1.03)
  })

  test('should sweep the upper plume down and outward along an asymmetric curved arc', () => {
    const tip = tails[2]!
    const rest = renderTail(tip, 0)
    const upper = tip.mesh.vertices.flatMap((value, index) =>
      index % 2 === 1 && value === 403 ? [index - 1] : [],
    )
    const outer = upper.reduce((right, index) => (rest[index]! > rest[right]! ? index : right))
    const outward = renderTail(tip, 1)
    const inward = renderTail(tip, -1)
    const middle = renderTail(tip, 0.5)
    const down = outward[outer + 1]! - rest[outer + 1]!
    const rise = rest[outer + 1]! - inward[outer + 1]!
    expect(outward[outer]! - rest[outer]!).toBeGreaterThan(300)
    expect(rest[outer]! - inward[outer]!).toBeGreaterThan(200)
    expect(down).toBeGreaterThan(150)
    expect(rise).toBeGreaterThan(70)
    expect(down).toBeGreaterThan(rise * 1.5)
    expect(middle[outer + 1]! - rest[outer + 1]!).toBeGreaterThan(down * 0.35)
    expect(middle[outer + 1]! - rest[outer + 1]!).toBeLessThan(down * 0.49)
  })

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

  test('should sample a subtle asymmetric idle with matching loop position and velocity', () => {
    const motion = model.motions.find((candidate) => candidate.id === 'idle')!
    const sample = (time: number) =>
      sampleMotionParameterValues({motion, parameters: model.parameters, time})['tail-sway']!
    const samples = Array.from({length: 181}, (_, index) => sample((index * motion.duration) / 180))
    expect(samples.every(Number.isFinite)).toBe(true)
    expect(Math.min(...samples)).toBeLessThan(-0.2)
    expect(Math.max(...samples)).toBeGreaterThan(0.3)
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(0.55)
    expect(sample(0)).toBe(sample(motion.duration))
    expect(Math.abs(sample(0.001) - sample(0))).toBeLessThan(0.00001)
    expect(Math.abs(sample(motion.duration) - sample(motion.duration - 0.001))).toBeLessThan(
      0.00001,
    )
    expect(Math.abs(Math.max(...samples) + Math.min(...samples))).toBeGreaterThan(0.05)
  })
})
