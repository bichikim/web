/** @vitest-environment jsdom */
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

describe('development model chest surface perspective', () => {
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
