import {describe, expect, test} from 'vitest'

import {transformDeformerPoint} from '../../../deformation'
import type {PuppetSceneDeformerNode} from '../../../player'
import {
  createDeformerControlPoints,
  isGridDivisionCount,
  resampleDeformerGrid,
  resampleGridControlPoints,
} from '../grid-control-points'

const MAXIMUM_SURFACE_RESAMPLE_ERROR_RATIO = 0.04

const createCurvedDeformer = (
  curveHandles: PuppetSceneDeformerNode['curveHandles'],
): PuppetSceneDeformerNode => ({
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
  curveHandles,
  id: 'deformer',
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rows: 1,
  visible: true,
})

const expectSurfaceToMatch = (
  source: PuppetSceneDeformerNode,
  resized: PuppetSceneDeformerNode,
) => {
  for (const y of [0, 20, 50, 80, 100]) {
    for (const x of [0, 12.5, 50, 87.5, 100]) {
      const sourcePoint = transformDeformerPoint(source, {x, y})
      const resizedPoint = transformDeformerPoint(resized, {x, y})

      expect(resizedPoint.x).toBeCloseTo(sourcePoint.x, 8)
      expect(resizedPoint.y).toBeCloseTo(sourcePoint.y, 8)
    }
  }
}

const getMaximumSurfaceDistance = (
  source: PuppetSceneDeformerNode,
  resized: PuppetSceneDeformerNode,
) => {
  let maximumDistance = 0

  for (let y = 0; y <= 100; y += 5) {
    for (let x = 0; x <= 100; x += 5) {
      const sourcePoint = transformDeformerPoint(source, {x, y})
      const resizedPoint = transformDeformerPoint(resized, {x, y})
      maximumDistance = Math.max(
        maximumDistance,
        Math.hypot(resizedPoint.x - sourcePoint.x, resizedPoint.y - sourcePoint.y),
      )
    }
  }

  return maximumDistance
}

describe('grid control points', () => {
  test('should create a row-major control lattice over the bounds', () => {
    expect(
      createDeformerControlPoints({
        bounds: {height: 20, width: 20, x: 10, y: 30},
        columns: 2,
        rows: 1,
      }),
    ).toEqual([10, 30, 20, 30, 30, 30, 10, 50, 20, 50, 30, 50])
  })

  test('should preserve the deformed surface while changing its divisions', () => {
    const controlPoints = resampleGridControlPoints({
      columns: 1,
      controlPoints: [0, 0, 100, 0, 0, 100, 120, 100],
      nextColumns: 2,
      nextRows: 2,
      rows: 1,
    })

    expect(controlPoints).toHaveLength(18)
    expect(controlPoints.slice(0, 2)).toEqual([0, 0])
    expect(controlPoints.slice(8, 10)).toEqual([55, 50])
    expect(controlPoints.slice(-2)).toEqual([120, 100])
  })

  test('should preserve a horizontal curve while increasing horizontal divisions', () => {
    const source = createCurvedDeformer([
      {
        horizontal: {x: 100 / 3, y: 100},
        pointIndex: 0,
        vertical: {x: 0, y: 100 / 3},
      },
    ])
    const resized = resampleDeformerGrid({columns: 2, node: source, rows: 1})

    expect(transformDeformerPoint(source, {x: 50, y: 0}).y).toBeCloseTo(37.5, 8)
    expectSurfaceToMatch(source, resized)
  })

  test('should preserve a vertical curve while increasing vertical divisions', () => {
    const source = createCurvedDeformer([
      {
        horizontal: {x: 100 / 3, y: 0},
        pointIndex: 0,
        vertical: {x: 100, y: 100 / 3},
      },
    ])
    const resized = resampleDeformerGrid({columns: 1, node: source, rows: 3})

    expectSurfaceToMatch(source, resized)
  })

  test('should preserve a separable two-dimensional curved surface while increasing both divisions', () => {
    const source = createCurvedDeformer([
      {
        horizontal: {x: 100 / 3, y: 30},
        pointIndex: 0,
        vertical: {x: 20, y: 100 / 3},
      },
      {
        horizontal: {x: 100 + 100 / 3, y: 30},
        pointIndex: 1,
        vertical: {x: 120, y: 100 / 3},
      },
      {
        horizontal: {x: 100 / 3, y: 130},
        pointIndex: 2,
        vertical: {x: 20, y: 100 + 100 / 3},
      },
      {
        horizontal: {x: 100 + 100 / 3, y: 130},
        pointIndex: 3,
        vertical: {x: 120, y: 100 + 100 / 3},
      },
    ])
    const resized = resampleDeformerGrid({columns: 3, node: source, rows: 2})

    expectSurfaceToMatch(source, resized)
  })

  test('should keep asymmetric surface resampling within the version one error bound', () => {
    const source = createCurvedDeformer([
      {
        horizontal: {x: 30, y: 45},
        pointIndex: 0,
        vertical: {x: 25, y: 35},
      },
      {
        horizontal: {x: 130, y: -20},
        pointIndex: 1,
        vertical: {x: 80, y: 40},
      },
      {
        horizontal: {x: 20, y: 120},
        pointIndex: 2,
        vertical: {x: -15, y: 135},
      },
      {
        horizontal: {x: 125, y: 130},
        pointIndex: 3,
        vertical: {x: 115, y: 140},
      },
    ])
    const verticalResize = resampleDeformerGrid({columns: 1, node: source, rows: 2})
    const twoDimensionalResize = resampleDeformerGrid({columns: 2, node: source, rows: 2})
    const maximumError =
      Math.max(
        getMaximumSurfaceDistance(source, verticalResize),
        getMaximumSurfaceDistance(source, twoDimensionalResize),
      ) / Math.max(source.bounds.width, source.bounds.height)

    expect(maximumError).toBeLessThan(MAXIMUM_SURFACE_RESAMPLE_ERROR_RATIO)
  })

  test('should retain curve influence while reducing both divisions', () => {
    const source: PuppetSceneDeformerNode = {
      ...createCurvedDeformer(undefined),
      columns: 2,
      controlPoints: [0, 0, 50, 0, 100, 0, 0, 50, 50, 50, 100, 50, 0, 100, 50, 100, 100, 100],
      curveHandles: [
        {
          horizontal: {x: 75, y: 80},
          pointIndex: 4,
          vertical: {x: 80, y: 75},
        },
      ],
      rows: 2,
    }
    const resized = resampleDeformerGrid({columns: 1, node: source, rows: 1})

    expect(resized.curveHandles).toEqual(
      expect.arrayContaining([expect.objectContaining({pointIndex: 3})]),
    )
  })

  test('should accept only bounded positive integer divisions', () => {
    expect(isGridDivisionCount(1)).toBe(true)
    expect(isGridDivisionCount(32)).toBe(true)
    expect(isGridDivisionCount(0)).toBe(false)
    expect(isGridDivisionCount(1.5)).toBe(false)
    expect(isGridDivisionCount(33)).toBe(false)
  })
})
