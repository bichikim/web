import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetDocument, PuppetMesh} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const flat = {
  ...model,
  parameterBindings: model.parameterBindings?.filter((binding) => binding.id !== 'chest-surface'),
}
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
const parts = model.parts.filter((part) =>
  ['psd-45', 'psd-47', 'psd-48', 'psd-49', 'psd-50', 'psd-51'].includes(part.id),
)
const meanX = (vertices: ReadonlyArray<number>) =>
  vertices.filter((_, index) => index % 2 === 0).reduce((sum, x) => sum + x, 0) /
  (vertices.length / 2)

const sampleSurface = (
  mesh: PuppetMesh,
  vertices: ReadonlyArray<number>,
  point: ReadonlyArray<number>,
): ReadonlyArray<number> => {
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const [a, b, c] = mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
    const rest = mesh.vertices
    const determinant =
      (rest[b! + 1]! - rest[c! + 1]!) * (rest[a!]! - rest[c!]!) +
      (rest[c!]! - rest[b!]!) * (rest[a! + 1]! - rest[c! + 1]!)
    const first =
      ((rest[b! + 1]! - rest[c! + 1]!) * (point[0]! - rest[c!]!) +
        (rest[c!]! - rest[b!]!) * (point[1]! - rest[c! + 1]!)) /
      determinant
    const second =
      ((rest[c! + 1]! - rest[a! + 1]!) * (point[0]! - rest[c!]!) +
        (rest[a!]! - rest[c!]!) * (point[1]! - rest[c! + 1]!)) /
      determinant
    const third = 1 - first - second
    if (Math.min(first, second, third) >= -0.00001) {
      return [0, 1].map(
        (axis) =>
          first * vertices[a! + axis]! +
          second * vertices[b! + axis]! +
          third * vertices[c! + axis]!,
      )
    }
  }
  throw new Error('Reference point is outside the cloth mesh')
}

describe('development model chest surface perspective', () => {
  test.each([-30, 30])(
    'should follow the reference contour and retain the existing cleft at body=%s',
    (body) => {
      const part = model.parts.find((candidate) => candidate.id === 'psd-45')!
      const turned = render(model, part.id, {'body-x': body})
      const direction = Math.sign(body)
      const landmarks = [
        {source: [77, 257], target: [155, 255]},
        {source: [130, 426], target: [190, 440]},
        // Preserve the cleft placement in the user-annotated pose while refining its outer edges.
        {source: [205, 399], target: [306, 412.5]},
        {source: [280, 426], target: [323, 437]},
        {source: [205, 315], target: [313, 315]},
      ]
      for (const landmark of landmarks) {
        const point = [
          2020 + (landmark.source[0]! - 205) * 2.5 * direction,
          2040 + (landmark.source[1]! - 315) * 2.5,
        ]
        const position = sampleSurface(part.mesh, turned, point)
        expect(
          Math.abs(position[0]! - (2020 + (landmark.target[0]! - 205) * 2.5 * direction)),
        ).toBeLessThan(15)
        expect(Math.abs(position[1]! - (2040 + (landmark.target[1]! - 315) * 2.5))).toBeLessThan(15)
      }
    },
  )

  test.each([-30, 30])('should keep the bow loops rounded at body=%s', (body) => {
    const width = (vertices: ReadonlyArray<number>) => {
      const xs = vertices.filter((_, index) => index % 2 === 0)
      return Math.max(...xs) - Math.min(...xs)
    }
    for (const partId of ['psd-49', 'psd-50']) {
      const ratio =
        width(render(model, partId, {'body-x': body})) / width(render(model, partId, {}))
      expect(ratio).toBeGreaterThan(0.85)
      expect(ratio).toBeLessThan(1.1)
    }
  })

  test.each(
    [-30, -7.5, 0, 7.5, 30].flatMap((body) =>
      [-22, -5.5, 0, 5.5, 22].map((full) => ({body, full})),
    ),
  )('should retain overall chest volume at body=$body, full=$full', ({body, full}) => {
    const neutral = render(model, 'psd-45', {})
    const curved = render(model, 'psd-45', {'body-x': body, 'full-body-x': full})
    const bounds = (vertices: ReadonlyArray<number>, axis: number) => {
      const coordinates = vertices.filter((_, index) => index % 2 === axis)
      return {maximum: Math.max(...coordinates), minimum: Math.min(...coordinates)}
    }
    const before = bounds(neutral, 0)
    const after = bounds(curved, 0)
    const ratio = (after.maximum - after.minimum) / (before.maximum - before.minimum)
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
    expect(
      Math.abs((after.minimum + after.maximum - before.minimum - before.maximum) / 2),
    ).toBeLessThan(40)
    const beforeHeight = bounds(neutral, 1)
    const afterHeight = bounds(curved, 1)
    expect(
      (afterHeight.maximum - afterHeight.minimum) / (beforeHeight.maximum - beforeHeight.minimum),
    ).toBeLessThan(1.08)
  })

  test('should retain neutral chest width and upper attachment while fitting its hem', () => {
    for (const part of parts) {
      const original = render(flat, part.id, {})
      render(model, part.id, {}).forEach((value, index) => {
        if (index % 2 === 0) {
          expect(value).toBeCloseTo(original[index]!, 5)
          return
        }
        if (original[index]! <= 2040) {
          expect(Math.abs(value - original[index]!)).toBeLessThan(1.5)
          return
        }
        expect(value - original[index]!).toBeGreaterThanOrEqual(-0.001)
        expect(value - original[index]!).toBeLessThan(80)
      })
    }
  })

  test.each(['body-x', 'full-body-x'])(
    'should curve the cloth and carry the ribbon with %s',
    (parameterId) => {
      for (const direction of [-1, 1]) {
        const values = {[parameterId]: direction * (parameterId === 'body-x' ? 30 : 22)}
        const original = render(flat, 'psd-45', values)
        const curved = render(model, 'psd-45', values)
        const shifts = curved
          .filter((_, index) => index % 2 === 0)
          .map((x, index) => (x - original[index * 2]!) * direction)
        expect(Math.max(...shifts) - Math.min(...shifts)).toBeGreaterThan(25)
        expect(
          (meanX(render(model, 'psd-51', values)) - meanX(render(model, 'psd-51', {}))) * direction,
        ).toBeGreaterThan(20)
      }
    },
  )

  test.each([-30, -15, 0, 15, 30].flatMap((body) => [-22, 0, 22].map((full) => ({body, full}))))(
    'should keep cloth and ribbon meshes unfolded at body=$body, full=$full',
    ({body, full}) => {
      const values = {'body-x': body, breath: 1, 'full-body-x': full}
      for (const part of parts) {
        const original = render(flat, part.id, values)
        const curved = render(model, part.id, values)
        expect(curved.every(Number.isFinite)).toBe(true)
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
