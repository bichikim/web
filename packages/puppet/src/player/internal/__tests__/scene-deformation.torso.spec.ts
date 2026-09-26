import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetDocument} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const flat = {
  ...model,
  parameterBindings: model.parameterBindings?.filter((binding) => binding.id !== 'torso-surface'),
}
const parts = model.parts.filter((part) =>
  ['psd-39', 'psd-41', 'psd-42', 'psd-43'].includes(part.id),
)
const render = (
  document: PuppetDocument,
  partId: string,
  values: Readonly<Record<string, number>>,
) => {
  const part = document.parts.find((candidate) => candidate.id === partId)!
  const vertices = [
    ...composeParameterVertices({
      document,
      parameterValues: values,
      partId,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...document, scene: composeParameterScene(document, values)},
    verticesByPartId: new Map([[partId, vertices]]),
  })
  return vertices
}

describe('development model torso cylinder', () => {
  test.each([-30, -7.5, 0, 7.5, 30].flatMap((body) => [-22, 0, 22].map((full) => ({body, full}))))(
    'should retain torso and belt width at body=$body, full=$full',
    ({body, full}) => {
      for (const partId of ['psd-39', 'psd-43']) {
        const width = (vertices: ReadonlyArray<number>) => {
          const xs = vertices.filter((_, index) => index % 2 === 0)
          return Math.max(...xs) - Math.min(...xs)
        }
        const neutral = render(model, partId, {})
        const turned = render(model, partId, {'body-x': body, 'full-body-x': full})
        expect(width(turned) / width(neutral), partId).toBeGreaterThan(0.94)
        expect(width(turned) / width(neutral), partId).toBeLessThan(1.06)
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const row = partId === 'psd-39' ? 2552 : 2539
        const indices = part.mesh.vertices.flatMap((_, index) =>
          index % 2 === 0 && part.mesh.vertices[index + 1] === row ? [index] : [],
        )
        // These are the opaque edges at the sampled texture rows, excluding transparent margins.
        const edges = partId === 'psd-39' ? [1685, 2354] : [1663, 2376]
        const ordered = indices.toSorted((a, b) => part.mesh.vertices[a]! - part.mesh.vertices[b]!)
        const center = (vertices: ReadonlyArray<number>) => {
          const positions = edges.map((edge) => {
            const right = ordered.findIndex((index) => part.mesh.vertices[index]! >= edge)
            const previous = ordered[Math.max(0, right - 1)]!
            const next = ordered[right]!
            const amount =
              (edge - part.mesh.vertices[previous]!) /
              (part.mesh.vertices[next]! - part.mesh.vertices[previous]!)
            return vertices[previous]! + (vertices[next]! - vertices[previous]!) * amount
          })
          return (positions[0]! + positions[1]!) / 2
        }
        expect(Math.abs(center(turned) - center(neutral)), `${partId} translation`).toBeLessThan(5)
      }
    },
  )

  test('should widen both belt edges while fitting the outfit height', () => {
    const original = render(flat, 'psd-43', {})
    render(model, 'psd-43', {}).forEach((value, index) => {
      if (index % 2 === 0) {
        const offset = original[index]! - 2020
        if (Math.abs(offset) < 140) {
          expect(value).toBeCloseTo(original[index]!, 5)
        }
        if (
          Math.abs(offset) > 300 &&
          original[index + 1]! >= 2465 &&
          original[index + 1]! <= 2555
        ) {
          expect((value - original[index]!) * Math.sign(offset)).toBeGreaterThan(5)
          expect(Math.abs(value - original[index]!)).toBeLessThan(65)
        }
        return
      }
      expect(value - original[index]!).toBeGreaterThan(0)
      expect(value - original[index]!).toBeLessThan(80)
    })
  })

  test.each(['body-x', 'full-body-x'])('should wrap the torso and belt with %s', (parameterId) => {
    for (const direction of [-1, 1]) {
      const values = {[parameterId]: direction * (parameterId === 'body-x' ? 30 : 22)}
      for (const partId of ['psd-39', 'psd-43']) {
        const original = render(flat, partId, values)
        const curved = render(model, partId, values)
        const shifts = curved
          .filter((_, index) => index % 2 === 0)
          .map((x, index) => (x - original[index * 2]!) * direction)
        expect(Math.max(...shifts) - Math.min(...shifts), partId).toBeGreaterThan(20)
      }
    }
  })

  test.each([-30, -15, 0, 15, 30].flatMap((body) => [-22, 0, 22].map((full) => ({body, full}))))(
    'should preserve mesh orientation and the lower skirt at body=$body, full=$full',
    ({body, full}) => {
      const values = {'body-x': body, breath: 1, 'full-body-x': full}
      for (const part of parts) {
        const original = render(flat, part.id, values)
        const curved = render(model, part.id, values)
        expect(curved.every(Number.isFinite)).toBe(true)
        for (let index = 0; index < part.mesh.vertices.length; index += 2) {
          if (part.mesh.vertices[index + 1]! >= 3350) {
            expect(curved[index]).toBeCloseTo(original[index]!, 6)
            expect(curved[index + 1]).toBeCloseTo(original[index + 1]!, 6)
          }
        }
        for (let index = 0; index < part.mesh.indices.length; index += 3) {
          const [a, b, c] = part.mesh.indices.slice(index, index + 3).map((point) => point * 2)
          const area = (vertices: ReadonlyArray<number>) =>
            (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
            (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
          expect(area(curved) / area(original), `${part.id} triangle ${index / 3}`).toBeGreaterThan(
            0.25,
          )
        }
      }
    },
  )
})
