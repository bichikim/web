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
const arms = model.parts.filter((part) =>
  ['psd-27', 'psd-28', 'psd-30', 'psd-35'].includes(part.id),
)
const sceneCache = new WeakMap<
  PuppetDocument,
  Map<string, ReturnType<typeof composeParameterScene>>
>()

const getParameterScene = (document: PuppetDocument, values: Readonly<Record<string, number>>) => {
  let documentCache = sceneCache.get(document)
  if (documentCache === undefined) {
    documentCache = new Map()
    sceneCache.set(document, documentCache)
  }

  const cacheKey = JSON.stringify(
    Object.entries(values).sort(([firstId], [secondId]) => firstId.localeCompare(secondId)),
  )
  const cachedScene = documentCache.get(cacheKey)
  if (cachedScene !== undefined) {
    return cachedScene
  }

  const scene = composeParameterScene(document, values)
  documentCache.set(cacheKey, scene)
  return scene
}

const renderArm = (
  part: PuppetPart,
  values: Readonly<Record<string, number>>,
  document = model,
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
    document: {...document, scene: getParameterScene(document, values)},
    verticesByPartId: new Map([[part.id, vertices]]),
  })
  return vertices
}

const width = (vertices: ReadonlyArray<number>) => {
  const horizontal = vertices.filter((_, index) => index % 2 === 0)
  return Math.max(...horizontal) - Math.min(...horizontal)
}

const triangleArea = (vertices: ReadonlyArray<number>, a: number, b: number, c: number) => {
  const first = a * 2
  const second = b * 2
  const third = c * 2
  return (
    (vertices[second]! - vertices[first]!) * (vertices[third + 1]! - vertices[first + 1]!) -
    (vertices[second + 1]! - vertices[first + 1]!) * (vertices[third]! - vertices[first]!)
  )
}

describe('development model independent arm movement', () => {
  test.each([
    {otherId: 'psd-28', parameterId: 'arm-left-x', partId: 'psd-27'},
    {otherId: 'psd-27', parameterId: 'arm-right-x', partId: 'psd-28'},
  ])(
    'should move $partId in both directions without moving the other hand',
    ({otherId, parameterId, partId}) => {
      const part = model.parts.find((candidate) => candidate.id === partId)!
      const other = model.parts.find((candidate) => candidate.id === otherId)!
      const neutral = renderArm(part, {})
      for (const direction of [-1, 1]) {
        const values = {[parameterId]: direction}
        const vertices = renderArm(part, values)
        const shifts = vertices
          .filter((_, index) => index % 2 === 0)
          .map((x, index) => (x - neutral[index * 2]!) * direction)
        expect(Math.min(...shifts)).toBeGreaterThan(100)
        expect(Math.max(...shifts)).toBeLessThan(240)
        expect(renderArm(other, values)).toEqual(renderArm(other, {}))
      }
    },
  )
})

describe('development model arm yaw volume', () => {
  test.each(['body-x', 'full-body-x'])(
    'should fold the outer sleeve panel separately for %s',
    (parameterId) => {
      const flat = {
        ...model,
        parameterBindings: model.parameterBindings?.filter(
          (binding) => binding.id !== 'sleeve-side-panels',
        ),
      }
      for (const partId of ['psd-30', 'psd-35']) {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const side = partId === 'psd-30' ? 1 : -1
        for (const direction of [-1, 1]) {
          const values = {[parameterId]: direction * (parameterId === 'body-x' ? 30 : 22)}
          const original = renderArm(part, values, flat)
          const moved = renderArm(part, values)
          const shifts = part.mesh.vertices.flatMap((y, index) =>
            index % 2 === 1 && y >= 2300 && y <= 2850
              ? [(moved[index - 1]! - original[index - 1]!) * side]
              : [],
          )
          const near = side === direction
          expect(
            near ? -Math.min(...shifts) : Math.max(...shifts),
            `${partId} ${direction}`,
          ).toBeGreaterThan(8)
          expect(Math.min(...shifts.map(Math.abs)), partId).toBeLessThan(1e-5)
        }
      }
    },
  )

  test.each(['body-x', 'full-body-x'])(
    'should reverse near-arm widening and far-arm narrowing with %s direction',
    (parameterId) => {
      for (const direction of [-1, 1]) {
        for (const part of arms) {
          const values = {[parameterId]: direction * (parameterId === 'body-x' ? 30 : 22)}
          const ratio = width(renderArm(part, values)) / width(renderArm(part, {}))
          const near = (['psd-27', 'psd-30'].includes(part.id) ? 1 : -1) === direction
          expect(ratio, `${part.id} ${direction}`).toBeGreaterThan(near ? 1.15 : 0.55)
          expect(ratio, `${part.id} ${direction}`).toBeLessThan(near ? 1.3 : 0.85)
        }
      }
    },
  )

  test.each(
    [-30, -15, 0, 15, 30].flatMap((body) => [-22, -15, 0, 15, 22].map((full) => [body, full])),
  )('should keep arm meshes unfolded at body=%s, full=%s', (body, full) => {
    for (const part of arms) {
      const neutral = renderArm(part, {})
      const vertices = renderArm(part, {'body-x': body, 'full-body-x': full})
      expect(vertices.every(Number.isFinite)).toBe(true)
      const widthRatio = width(vertices) / width(neutral)
      expect(widthRatio).toBeGreaterThan(0.35)
      expect(widthRatio).toBeLessThan(1.5)
      for (let index = 0; index < part.mesh.indices.length; index += 3) {
        const a = part.mesh.indices[index]!
        const b = part.mesh.indices[index + 1]!
        const c = part.mesh.indices[index + 2]!
        const ratio = triangleArea(vertices, a, b, c) / triangleArea(neutral, a, b, c)
        expect(ratio, `${part.id} triangle ${index / 3}`).toBeGreaterThan(0.15)
      }
    }
  })
})

describe('development model articulated arms', () => {
  test.each(['left', 'right'])(
    'should independently lift, bend, foreshorten and tilt the %s hand',
    (side) => {
      const hand = model.parts.find((part) => part.id === (side === 'left' ? 'psd-27' : 'psd-28'))!
      const other = model.parts.find((part) => part.id === (side === 'left' ? 'psd-28' : 'psd-27'))!
      const neutral = renderArm(hand, {})
      for (const parameterId of [
        `arm-${side}-lift`,
        `arm-${side}-bend`,
        `arm-${side}-depth`,
        `hand-${side}-tilt`,
      ]) {
        expect(model.parameters?.some((parameter) => parameter.id === parameterId)).toBe(true)
        const values = {[parameterId]: 1}
        const moved = renderArm(hand, values)
        expect(
          Math.max(...moved.map((value, index) => Math.abs(value - neutral[index]!))),
        ).toBeGreaterThan(35)
        expect(renderArm(other, values)).toEqual(renderArm(other, {}))
      }
      const lifted = renderArm(hand, {[`arm-${side}-lift`]: 1})
      expect(Math.max(...lifted.filter((_, index) => index % 2 === 1))).toBeLessThan(
        Math.max(...neutral.filter((_, index) => index % 2 === 1)) - 100,
      )
    },
  )

  test.each(
    [-30, 0, 30].flatMap((body) =>
      ['left', 'right'].flatMap((side) =>
        [-1, 1].flatMap((horizontal) =>
          [0, 1].flatMap((lift) =>
            [-1, 1].flatMap((bend) =>
              [-1, 1].map((depth) => ({bend, body, depth, horizontal, lift, side})),
            ),
          ),
        ),
      ),
    ),
  )(
    'should preserve $side arm at yaw=$body, x=$horizontal, lift=$lift, bend=$bend, depth=$depth',
    ({body, side, horizontal, lift, bend, depth}) => {
      const partIds =
        side === 'left'
          ? ['psd-27', 'psd-30', 'psd-31', 'psd-32', 'psd-33']
          : ['psd-28', 'psd-35', 'psd-36', 'psd-37', 'psd-38']
      const baseline = {'body-x': body, 'full-body-x': (body * 22) / 30}
      const values = {
        ...baseline,
        [`arm-${side}-x`]: horizontal,
        [`arm-${side}-lift`]: lift,
        [`arm-${side}-bend`]: bend,
        [`arm-${side}-depth`]: depth,
        [`hand-${side}-tilt`]: bend,
        [`hand-${side}-curl`]: 1,
      }
      for (const partId of partIds) {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const neutral = renderArm(part, baseline)
        const moved = renderArm(part, values)
        expect(moved.every(Number.isFinite)).toBe(true)
        let hiddenVerticesPreserved = true
        for (let index = 1; index < part.mesh.vertices.length; index += 2) {
          const coordinate = part.mesh.vertices[index]!
          if (index % 2 === 1 && coordinate <= 1750) {
            if (
              Math.abs(moved[index - 1]! - neutral[index - 1]!) >= 0.000005 ||
              Math.abs(moved[index]! - neutral[index]!) >= 0.000005
            ) {
              hiddenVerticesPreserved = false
              break
            }
          }
        }
        expect(hiddenVerticesPreserved, `${partId} hidden vertices`).toBe(true)
        let minimumRatio = Infinity
        let maximumRatio = -Infinity
        for (let index = 0; index < part.mesh.indices.length; index += 3) {
          const a = part.mesh.indices[index]!
          const b = part.mesh.indices[index + 1]!
          const c = part.mesh.indices[index + 2]!
          const ratio = triangleArea(moved, a, b, c) / triangleArea(neutral, a, b, c)
          minimumRatio = Math.min(minimumRatio, ratio)
          maximumRatio = Math.max(maximumRatio, ratio)
        }
        expect(minimumRatio, `${partId} minimum triangle area ratio`).toBeGreaterThan(0.15)
        expect(maximumRatio, `${partId} maximum triangle area ratio`).toBeLessThan(2)
      }
    },
  )

  test.each(['left', 'right'])('should pin the hidden wrist while tilting the %s hand', (side) => {
    const part = model.parts.find(
      (candidate) => candidate.id === (side === 'left' ? 'psd-27' : 'psd-28'),
    )!
    for (const tilt of [-1, 1]) {
      const values = {[`hand-${side}-tilt`]: tilt, [`hand-${side}-curl`]: 1}
      const neutral = renderArm(part, {[`hand-${side}-curl`]: 1})
      const moved = renderArm(part, values)
      part.mesh.vertices.forEach((coordinate, index) => {
        if (index % 2 === 1 && coordinate <= 3300) {
          expect(moved[index - 1]).toBe(neutral[index - 1])
          expect(moved[index]).toBe(neutral[index])
        }
      })
    }
  })
})
