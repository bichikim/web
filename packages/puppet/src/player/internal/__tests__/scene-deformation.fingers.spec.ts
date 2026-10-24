import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetPart} from '../../document'
import {parseDocument} from '../../parse-document'
import {sampleMotionParameterValues} from '../motion'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const hands = [
  {base: 3490, parameterId: 'hand-left-curl', partId: 'psd-27'},
  {base: 3485, parameterId: 'hand-right-curl', partId: 'psd-28'},
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

describe('development model subtle finger curl', () => {
  test.each(hands)(
    'should bend $partId fingertips while keeping the wrist and palm attached',
    ({base, parameterId, partId}) => {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const original = render(part, {})
      const curled = render(part, {[parameterId]: 1})
      const distances = part.mesh.vertices.flatMap((_, index) => {
        if (index % 2 === 1) {
          return []
        }
        const distance = Math.hypot(
          curled[index]! - original[index]!,
          curled[index + 1]! - original[index + 1]!,
        )
        if (part.mesh.vertices[index + 1]! <= base) {
          expect(distance).toBe(0)
        }
        return [distance]
      })
      expect(Math.max(...distances)).toBeGreaterThan(25)
      expect(Math.max(...distances)).toBeLessThan(45)
      const other = model.parts.find(
        (candidate) => candidate.id === hands.find((hand) => hand.partId !== partId)!.partId,
      )!
      expect(render(other, {[parameterId]: 1})).toEqual(render(other, {}))
    },
  )

  test.each([-30, -15, 0, 15, 30])(
    'should preserve finger mesh orientation and attachment at body yaw %s',
    (body) => {
      for (const full of [-22, 0, 22]) {
        for (const {base, parameterId, partId} of hands) {
          const part = model.parts.find((candidate) => candidate.id === partId)!
          const values = {'body-x': body, 'full-body-x': full}
          const original = render(part, values)
          for (const curl of [0.5, 1]) {
            const curled = render(part, {...values, [parameterId]: curl})
            expect(curled.every(Number.isFinite)).toBe(true)
            part.mesh.vertices.forEach((coordinate, index) => {
              if (index % 2 === 1 && coordinate <= base) {
                expect(curled[index - 1]).toBe(original[index - 1])
                expect(curled[index]).toBe(original[index])
              }
            })
            for (let index = 0; index < part.mesh.indices.length; index += 3) {
              const triangle = part.mesh.indices.slice(index, index + 3)
              const ratio = triangleArea(curled, triangle) / triangleArea(original, triangle)
              expect(ratio, `${partId} triangle ${index / 3}`).toBeGreaterThan(0.65)
              expect(ratio, `${partId} triangle ${index / 3}`).toBeLessThan(1.35)
            }
          }
        }
      }
    },
  )

  test('should animate hands at different times with a continuous gentle idle loop', () => {
    const motion = model.motions.find((candidate) => candidate.id === 'idle')!
    const frames = Array.from({length: 541}, (_, frame) =>
      sampleMotionParameterValues({
        motion,
        parameters: model.parameters,
        parameterValues: {},
        time: frame / 60,
      }),
    )
    for (const {parameterId} of hands) {
      const values = frames.map((frame) => frame[parameterId]!)
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...values)).toBeLessThan(0.85)
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.4)
      expect(values.at(-1)).toBe(values[0])
      const steps = values.slice(1).map((value, index) => Math.abs(value - values[index]!))
      expect(Math.max(...steps)).toBeLessThan(0.02)
      expect(steps[0]).toBeLessThan(0.001)
      expect(steps.at(-1)).toBeLessThan(0.001)
    }
    expect(
      frames.some((frame) => Math.abs(frame['hand-left-curl']! - frame['hand-right-curl']!) > 0.3),
    ).toBe(true)
  })
})
