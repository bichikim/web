import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
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
const landmark = (x: number, y: number) => {
  const vertices = model.parts.find((part) => part.id === 'psd-58')!.mesh.vertices
  return vertices
    .flatMap((_, index) => (index % 2 === 0 ? [index] : []))
    .toSorted(
      (a, b) =>
        Math.hypot(vertices[a]! - x, vertices[a + 1]! - y) -
        Math.hypot(vertices[b]! - x, vertices[b + 1]! - y),
    )[0]!
}
const chin = landmark(2021, 1445)
const left = landmark(1691, 1362)
const right = landmark(2351, 1362)
const meanY = (vertices: ReadonlyArray<number>) =>
  vertices.filter((_, index) => index % 2 === 1).reduce((sum, y) => sum + y, 0) /
  (vertices.length / 2)

describe('development model upward chin projection', () => {
  test.each([-30, 0, 30])('should turn upward without lifting the whole head at yaw=%s', (yaw) => {
    const neutral = {'face-x': yaw, 'face-y': 0}
    const upward = {'face-x': yaw, 'face-y': 30}
    const rise = render('psd-58', neutral)[chin + 1]! - render('psd-58', upward)[chin + 1]!
    expect(rise).toBeGreaterThan(0)
    expect(rise).toBeLessThan(50)
    for (const partId of ['psd-60', 'psd-101', 'psd-116']) {
      expect(Math.abs(meanY(render(partId, upward)) - meanY(render(partId, neutral)))).toBeLessThan(
        45,
      )
    }
    const hairCenter = (values: Readonly<Record<string, number>>) =>
      (meanY(render('psd-132', values)) + meanY(render('psd-136', values))) / 2
    expect(Math.abs(hairCenter(upward) - hairCenter(neutral))).toBeLessThan(30)
  })

  test('should keep mouth-to-chin distance from growing while looking upward', () => {
    const distance = (pitch: number) =>
      render('psd-58', {'face-y': pitch})[chin + 1]! - meanY(render('psd-88', {'face-y': pitch}))
    const neutral = distance(0)
    for (const pitch of [15, 30]) {
      expect(distance(pitch)).toBeLessThan(neutral * 1.05)
      expect(distance(pitch)).toBeGreaterThan(neutral * 0.8)
    }
  })

  test('should broaden and flatten the lower jaw rather than sharpen its point', () => {
    const neutral = render('psd-58', {})
    const up = render('psd-58', {'face-y': 30})
    const depth = (vertices: ReadonlyArray<number>) =>
      vertices[chin + 1]! - (vertices[left + 1]! + vertices[right + 1]!) / 2
    expect(depth(up)).toBeLessThan(depth(neutral) * 0.95)
    expect(up[right]! - up[left]!).toBeGreaterThan(neutral[right]! - neutral[left]! + 15)
    const shadow = Math.max(
      ...render('psd-24', {'face-y': 30}).filter((_, index) => index % 2 === 1),
    )
    expect(shadow - up[chin + 1]!).toBeGreaterThan(60)
    expect(shadow - up[chin + 1]!).toBeLessThan(125)
  })

  test.each([-30, 0, 30].flatMap((yaw) => [0, 15, 30].map((pitch) => ({pitch, yaw}))))(
    'should preserve face, contour, mask and neck meshes at yaw=$yaw, pitch=$pitch',
    ({yaw, pitch}) => {
      for (const partId of [
        'psd-23',
        'psd-24',
        'psd-53',
        'psd-54',
        'psd-55',
        'psd-56',
        'psd-57',
        'psd-58',
        'face-outline-mask',
      ]) {
        const part = model.parts.find((candidate) => candidate.id === partId)!
        const moved = render(partId, {'face-x': yaw, 'face-y': pitch})
        expect(moved.every(Number.isFinite)).toBe(true)
        for (let index = 0; index < part.mesh.indices.length; index += 3) {
          const [a, b, c] = part.mesh.indices.slice(index, index + 3).map((vertex) => vertex * 2)
          const area = (vertices: ReadonlyArray<number>) =>
            (vertices[b!]! - vertices[a!]!) * (vertices[c! + 1]! - vertices[a! + 1]!) -
            (vertices[b! + 1]! - vertices[a! + 1]!) * (vertices[c!]! - vertices[a!]!)
          expect(
            area(moved) / area(part.mesh.vertices),
            `${partId} triangle ${index / 3}`,
          ).toBeGreaterThan(0)
        }
      }
    },
  )
})
