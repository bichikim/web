import {expect, test} from 'vitest'
import {blendRigidTransforms} from '../rigid-blend'
import {transformSkinPoint} from '../skinning'

const rotation = (angle: number, pivot = {x: 0, y: 0}) => {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return {
    xx: cosine,
    xy: -sine,
    yx: sine,
    x: pivot.x - cosine * pivot.x + sine * pivot.y,
    yy: cosine,
    y: pivot.y - sine * pivot.x - cosine * pivot.y,
  }
}

test.each([90, 155, 179])(
  'should preserve cross-section width when blending rotations %s degrees apart',
  (degrees) => {
    const matrix = blendRigidTransforms([
      {matrix: rotation(0), weight: 0.5},
      {matrix: rotation((degrees * Math.PI) / 180), weight: 0.5},
    ])!
    const top = transformSkinPoint(matrix, {x: 340, y: 222})
    const bottom = transformSkinPoint(matrix, {x: 340, y: 278})
    expect(Math.hypot(top.x - bottom.x, top.y - bottom.y)).toBeCloseTo(56)
    expect(matrix.xx * matrix.yy - matrix.xy * matrix.yx).toBeCloseTo(1)
  },
)

test('should preserve the shared pivot and take the short rotation across the angle boundary', () => {
  const pivot = {x: 368, y: 250}
  const matrix = blendRigidTransforms([
    {matrix: rotation((170 * Math.PI) / 180, pivot), weight: 0.5},
    {matrix: rotation((-170 * Math.PI) / 180, pivot), weight: 0.5},
  ])!
  const point = transformSkinPoint(matrix, pivot)
  expect(point.x).toBeCloseTo(pivot.x)
  expect(point.y).toBeCloseTo(pivot.y)
  expect(matrix.xx).toBeCloseTo(-1)
})

test('should preserve a single influence and average translations', () => {
  const matrix = {...rotation(0), x: 10, y: 20}
  expect(blendRigidTransforms([{matrix, weight: 1}])).toEqual(matrix)
  const mixed = blendRigidTransforms([
    {matrix, weight: 0.25},
    {matrix: rotation(0), weight: 0.75},
  ])!
  expect(mixed.x).toBeCloseTo(2.5)
  expect(mixed.y).toBeCloseTo(5)
  expect(blendRigidTransforms([])).toBeUndefined()
})
