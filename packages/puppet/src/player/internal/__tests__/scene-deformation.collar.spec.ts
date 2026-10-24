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
  parameterBindings: model.parameterBindings?.filter((binding) => binding.id !== 'collar-surface'),
}
const parts = model.parts.filter((part) => ['psd-97'].includes(part.id))
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

describe('development model collar cylinder', () => {
  test('should preserve the neutral collar', () => {
    for (const part of parts) {
      const original = render(flat, part.id, {})
      render(model, part.id, {}).forEach((value, index) =>
        expect(value).toBeCloseTo(original[index]!, 6),
      )
    }
  })

  test.each(['body-x', 'full-body-x'])('should wrap the collar with %s', (parameterId) => {
    for (const direction of [-1, 1]) {
      const values = {[parameterId]: direction * (parameterId === 'body-x' ? 30 : 22)}
      for (const partId of ['psd-97']) {
        const original = render(flat, partId, values)
        const curved = render(model, partId, values)
        const shifts = curved
          .filter((_, index) => index % 2 === 0)
          .map((x, index) => (x - original[index * 2]!) * direction)
        expect(Math.max(...shifts), partId).toBeGreaterThan(20)
        expect(Math.max(...shifts) - Math.min(...shifts), partId).toBeGreaterThan(20)
      }
    }
  })

  test.each([-30, -15, 0, 15, 30].flatMap((body) => [-22, 0, 22].map((full) => ({body, full}))))(
    'should preserve mesh orientation at body=$body, full=$full',
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
