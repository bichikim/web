import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import type {PuppetDocument, PuppetPart} from '../../document'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const frills = model.parts.filter((part) => ['psd-31', 'psd-36'].includes(part.id))
const inherited: PuppetDocument = {
  ...model,
  parameterBindings: model.parameterBindings?.filter(
    (binding) => !binding.id.startsWith('sleeve-frill-'),
  ),
}

const renderFrill = (
  document: PuppetDocument,
  part: PuppetPart,
  values: Readonly<Record<string, number>>,
) => {
  const vertices = [
    ...composeParameterVertices({
      document,
      parameterValues: values,
      partId: part.id,
      restVertices: part.mesh.vertices,
    }),
  ]
  applySceneDeformers({
    document: {...document, scene: composeParameterScene(document, values)},
    verticesByPartId: new Map([[part.id, vertices]]),
  })
  return vertices
}

const rowWidth = (part: PuppetPart, vertices: ReadonlyArray<number>) => {
  const row = part.mesh.vertices
    .flatMap((coordinate, index) => (index % 2 === 1 && coordinate === 3435 ? [index - 1] : []))
    .toSorted((first, second) => part.mesh.vertices[first]! - part.mesh.vertices[second]!)
  const first = row[0]!
  const last = row.at(-1)!
  return Math.hypot(vertices[last]! - vertices[first]!, vertices[last + 1]! - vertices[first + 1]!)
}

const triangleArea = (vertices: ReadonlyArray<number>, indices: ReadonlyArray<number>) => {
  const [first, second, third] = indices.map((index) => index * 2)
  return (
    (vertices[second!]! - vertices[first!]!) * (vertices[third! + 1]! - vertices[first! + 1]!) -
    (vertices[second! + 1]! - vertices[first! + 1]!) * (vertices[third!]! - vertices[first!]!)
  )
}

describe('development model lower sleeve frill depth', () => {
  test('should keep full-body yaw and all its keys within 22 while retaining body yaw at 30', () => {
    expect(model.parameters?.find((parameter) => parameter.id === 'full-body-x')).toMatchObject({
      defaultValue: 0,
      maximum: 22,
      minimum: -22,
    })
    expect(model.parameters?.find((parameter) => parameter.id === 'body-x')).toMatchObject({
      maximum: 30,
      minimum: -30,
    })
    const bindings = model.parameterBindings?.filter((binding) =>
      binding.parameterIds.includes('full-body-x'),
    )
    expect(bindings).toHaveLength(5)
    for (const binding of bindings ?? []) {
      const axis = binding.parameterIds.indexOf('full-body-x')
      const values = binding.keyforms.map((keyform) => keyform.values[axis]!)
      expect(Math.min(...values), binding.id).toBe(-22)
      expect(Math.max(...values), binding.id).toBe(22)
      expect(values.every((value) => Math.abs(value) <= 22)).toBe(true)
      if (binding.id === 'full-body-x' || binding.id === 'full-body-face-x') {
        expect(values).toEqual(expect.arrayContaining([-15, 0, 15]))
      }
    }
    for (const motion of model.motions) {
      for (const track of motion.tracks) {
        if (track.kind === 'parameter' && track.parameterId === 'full-body-x') {
          expect(track.keyframes.every((keyframe) => Math.abs(keyframe.value) <= 22)).toBe(true)
        }
      }
    }
    const pendulums = model.physics?.pendulums?.filter(
      (pendulum) =>
        pendulum.inputParameterId === 'full-body-x' &&
        (pendulum.id === 'skirt-flutter-left-x' || pendulum.id === 'skirt-flutter-right-x'),
    )
    expect(pendulums).toHaveLength(2)
    for (const pendulum of pendulums ?? []) {
      expect(pendulum.inputScale * 22).toBeCloseTo(22 / 30, 12)
    }
  })

  test.each(['body-x', 'full-body-x'])(
    'should widen the near hem and compress the far hem independently for %s',
    (parameterId) => {
      for (const direction of [-1, 1]) {
        for (const part of frills) {
          const values = {[parameterId]: direction * (parameterId === 'full-body-x' ? 22 : 30)}
          const original = renderFrill(inherited, part, values)
          const deformed = renderFrill(model, part, values)
          const ratio = rowWidth(part, deformed) / rowWidth(part, original)
          const near = (part.id === 'psd-31' ? 1 : -1) === direction
          expect(near ? ratio : 1 / ratio).toBeGreaterThan(1.02)
          const vertical = deformed
            .filter((_, index) => index % 2 === 1)
            .map((coordinate, index) => coordinate - original[index * 2 + 1]!)
          expect(Math.max(...vertical) - Math.min(...vertical)).toBeGreaterThan(4)
        }
      }
    },
  )

  test.each(
    [-30, -15, 0, 15, 30].flatMap((body) => [-22, -15, 0, 15, 22].map((full) => [body, full])),
  )('should retain attachment and triangle orientation at body=%s, full=%s', (body, full) => {
    for (const part of frills) {
      const values = {'body-x': body, 'full-body-x': full}
      const original = renderFrill(inherited, part, values)
      const deformed = renderFrill(model, part, values)
      expect(deformed.every(Number.isFinite)).toBe(true)
      for (let index = 0; index < part.mesh.vertices.length; index += 2) {
        if (part.mesh.vertices[index + 1]! <= 3183 || (body === 0 && full === 0)) {
          expect(deformed[index]).toBeCloseTo(original[index]!, 6)
          expect(deformed[index + 1]).toBeCloseTo(original[index + 1]!, 6)
        }
      }
      for (let index = 0; index < part.mesh.indices.length; index += 3) {
        const triangle = part.mesh.indices.slice(index, index + 3)
        const ratio = triangleArea(deformed, triangle) / triangleArea(original, triangle)
        expect(ratio).toBeGreaterThan(0.55)
        expect(ratio).toBeLessThan(1.45)
      }
    }
  })
})
