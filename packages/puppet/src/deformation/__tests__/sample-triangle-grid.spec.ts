import {expect, test} from 'vitest'
import type {PuppetDeformerShape} from '../../player/document'
import {sampleTriangleGrid} from '../sample-triangle-grid'

const grid: PuppetDeformerShape = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  columns: 1,
  controlPoints: [0, 0, 2, 0, 0, 2, 3, 3],
  rows: 1,
}

test('should interpolate each half of the cell on its triangle', () => {
  expect(sampleTriangleGrid(grid, {x: 0.25, y: 0.25})).toEqual({x: 0.5, y: 0.5})
  expect(sampleTriangleGrid(grid, {x: 0.75, y: 0.75})).toEqual({x: 2, y: 2})
})

test('should preserve affine transforms outside every side and corner of the warp', () => {
  const affine = {...grid, controlPoints: [10, 20, 12, 21, 11, 23, 13, 24]}
  for (const x of [-2, 0.5, 3]) {
    for (const y of [-2, 0.5, 3]) {
      expect(sampleTriangleGrid(affine, {x, y})).toEqual({x: 10 + 2 * x + y, y: 20 + x + 3 * y})
    }
  }
})

test('should interpolate the SDK virtual outer grid from the average corner transform', () => {
  const deformer = {...grid, controlPoints: [0, 0, 100, 0, 0, 100, 150, 150]}
  for (const [x, y, expectedX, expectedY] of [
    [-0.5, 0.25, -59.375, 15.625],
    [1.5, 0.25, 178.125, 53.125],
    [0.25, -0.5, 15.625, -59.375],
    [0.25, 1.5, 53.125, 178.125],
    [-0.5, -0.5, -81.25, -81.25],
    [1.5, 1.5, 218.75, 218.75],
    [-1, 2, -93.75, 206.25],
    [2, -1, 206.25, -93.75],
  ]) {
    const point = sampleTriangleGrid(deformer, {x: x!, y: y!})
    expect(point.x).toBeCloseTo(expectedX!, 9)
    expect(point.y).toBeCloseTo(expectedY!, 9)
  }
})
