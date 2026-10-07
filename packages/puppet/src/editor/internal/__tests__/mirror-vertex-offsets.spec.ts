import {expect, test} from 'vitest'
import {mirrorVertexOffsets} from '../mirror-vertex-offsets'

test('should interpolate a reflected displacement inside an asymmetric triangle', () => {
  const reference = [0, 0, 100, 0, 0, 100]
  const vertices = [0, 0, 120, 10, 0, 100]
  const result = mirrorVertexOffsets({
    axis: 'x',
    center: 25,
    indices: [0, 1, 2],
    reference,
    vertices,
  })
  expect(result).toEqual([-10, 5, 100, 0, 0, 100])
  expect(reference).toEqual([0, 0, 100, 0, 0, 100])
  expect(vertices).toEqual([0, 0, 120, 10, 0, 100])
})

test('should reflect vertical offsets while retaining the original vertex order', () => {
  expect(
    mirrorVertexOffsets({
      axis: 'y',
      center: 50,
      indices: [0, 1, 2, 1, 3, 2],
      reference: [0, 0, 100, 0, 0, 100, 100, 100],
      vertices: [5, 10, 105, 10, 10, 120, 110, 120],
    }),
  ).toEqual([10, -20, 110, -20, 5, 90, 105, 90])
})
