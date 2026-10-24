/** @vitest-environment jsdom */
import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {sampleMotionParameterValues} from '../motion'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const preview = model.motions.find((motion) => motion.id === '발음 립싱크 미리보기')!
const sample = (time: number) =>
  sampleMotionParameterValues({
    motion: preview,
    parameters: model.parameters,
    parameterValues: {},
    time,
  })
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
const bounds = (vertices: ReadonlyArray<number>) => {
  const xs = vertices.filter((_, index) => index % 2 === 0)
  const ys = vertices.filter((_, index) => index % 2 === 1)
  return {
    bottom: Math.max(...ys),
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
  }
}

describe('development model articulation', () => {
  test.each([-30, 0, 30].flatMap((yaw) => [-30, 0, 30].map((pitch) => ({pitch, yaw}))))(
    'should retain mouth surfaces at yaw=$yaw and pitch=$pitch',
    ({yaw, pitch}) => {
      for (const open of [0, 0.35, 1]) {
        const values = {
          'face-x': yaw,
          'face-y': pitch,
          'face-z': 15,
          'mouth-open': open,
          'mouth-shape': 0.7,
        }
        const background = bounds(render('psd-79', values))
        const upper = bounds(render('psd-91', values))
        const lower = bounds(render('psd-88', values))
        expect(background.left).toBeLessThan(Math.min(upper.left, lower.left))
        expect(background.right).toBeGreaterThan(Math.max(upper.right, lower.right))
        expect(background.top).toBeLessThan(upper.top)
        expect(background.bottom).toBeGreaterThan(lower.bottom)
        for (const partId of [
          'psd-79',
          'psd-80',
          'psd-81',
          'psd-83',
          'psd-84',
          'psd-85',
          'psd-87',
          'psd-88',
          'psd-90',
          'psd-91',
        ]) {
          const part = model.parts.find((candidate) => candidate.id === partId)!
          const vertices = render(partId, values)
          expect(vertices.every(Number.isFinite)).toBe(true)
          for (let index = 0; index < part.mesh.indices.length; index += 3) {
            const [a, b, c] = part.mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
            const area = (v: ReadonlyArray<number>) =>
              (v[b!]! - v[a!]!) * (v[c! + 1]! - v[a! + 1]!) -
              (v[b! + 1]! - v[a! + 1]!) * (v[c!]! - v[a!]!)
            expect(area(vertices) / area(part.mesh.vertices), partId).toBeGreaterThan(0)
          }
        }
      }
    },
  )

  test.each([-30, 0, 30])(
    'should keep mouth surfaces unfolded and the background behind the aperture at yaw %s',
    (yaw) => {
      const parts = [
        'psd-79',
        'psd-80',
        'psd-81',
        'psd-83',
        'psd-84',
        'psd-85',
        'psd-87',
        'psd-88',
        'psd-90',
        'psd-91',
      ]
      for (const time of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
        const values = {...sample(time), 'face-x': yaw}
        const background = bounds(render('psd-79', values))
        const upper = bounds(render('psd-91', values))
        const lower = bounds(render('psd-88', values))
        expect(background.top).toBeLessThan(upper.top)
        expect(background.bottom).toBeGreaterThan(lower.bottom)
        expect(background.left).toBeLessThan(Math.min(upper.left, lower.left))
        expect(background.right).toBeGreaterThan(Math.max(upper.right, lower.right))
        for (const partId of parts) {
          const part = model.parts.find((candidate) => candidate.id === partId)!
          const vertices = render(partId, values)
          expect(vertices.every(Number.isFinite)).toBe(true)
          for (let index = 0; index < part.mesh.indices.length; index += 3) {
            const [a, b, c] = part.mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
            const area = (v: ReadonlyArray<number>) =>
              (v[b!]! - v[a!]!) * (v[c! + 1]! - v[a! + 1]!) -
              (v[b! + 1]! - v[a! + 1]!) * (v[c!]! - v[a!]!)
            expect(
              area(vertices) / area(part.mesh.vertices),
              `${partId} time ${time} triangle ${index / 3}`,
            ).toBeGreaterThan(0)
          }
        }
      }
    },
  )
})
