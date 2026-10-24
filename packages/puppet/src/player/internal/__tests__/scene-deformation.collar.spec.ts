import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetDocument} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'
import {getSpatialPartPose} from '../spatial-part'

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
  const pose = getSpatialPartPose({document, parameterValues: values, part})
  const vertices = composeParameterVertices({
    document,
    parameterValues: values,
    partId,
    restVertices: part.mesh.vertices,
  }).map((coordinate, index) =>
    pose === undefined
      ? coordinate
      : coordinate + pose.vertices[index]! - part.mesh.vertices[index]!,
  )
  applySceneDeformers({
    document: {...document, scene: composeParameterScene(document, values)},
    verticesByPartId: new Map([[partId, vertices]]),
  })
  return vertices
}

describe('development model collar spatial surface', () => {
  test('should attach every collar vertex to a curved mesh', () => {
    const part = parts[0]!
    expect(part.spatial?.attachments).toHaveLength(part.mesh.vertices.length / 2)
    const depths = part.spatial!.controlPoints.filter((_, index) => index % 3 === 2)
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(150)
  })

  test('should preserve the neutral collar', () => {
    for (const part of parts) {
      const original = render(flat, part.id, {})
      render(model, part.id, {}).forEach((value, index) =>
        expect(value).toBeCloseTo(original[index]!, 6),
      )
    }
  })

  test.each([-1, 1])('should use only cylinder Y rotation when turning %s', (direction) => {
    const values = {'body-x': direction * 30, 'full-body-x': direction * 22}
    for (const part of parts) {
      const pose = getSpatialPartPose({document: model, parameterValues: values, part})!
      const vertices = render(model, part.id, values)
      vertices.forEach((value, index) => {
        expect(value).toBeCloseTo(pose.vertices[index]!, 6)
        if (index % 2 === 1) {
          expect(value).toBeCloseTo(part.mesh.vertices[index]!, 6)
        }
      })
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
