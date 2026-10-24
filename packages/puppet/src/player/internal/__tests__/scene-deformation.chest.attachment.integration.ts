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
})
