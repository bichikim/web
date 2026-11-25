import {expect, it} from 'vitest'
import {meshPoint} from '../mesh-point'

it('should sample triangle coordinates after deformation and ignore missing or collapsed triangles', () => {
  const options = {indices: [0, 1, 2], point: {x: 15, y: 15}, vertices: [10, 10, 30, 10, 10, 30]}
  expect(meshPoint(options)).toEqual({indices: [0, 1, 2], weights: [0.5, 0.25, 0.25]})
  expect(meshPoint({...options, point: {x: 25, y: 25}})).toBeUndefined()
  expect(meshPoint({...options, vertices: [0, 0, 0, 0, 0, 0]})).toBeUndefined()
  expect(meshPoint({...options, indices: []})).toBeUndefined()
  expect(meshPoint({...options, point: {x: Number.NaN, y: 0}})).toBeUndefined()
})
