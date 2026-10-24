import {describe, expect, test} from 'vitest'

import type {PuppetSceneDeformerNode} from '../../../player'
import {createDeformerControlPoints} from '../grid-control-points'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  reflectCurveHandlePoint,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
  translateDeformerControlPoints,
  translateDeformerCurveHandles,
} from '../deformer-transform'

const deformer: PuppetSceneDeformerNode = {
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
  id: 'deformer',
  kind: 'deformer',
  locked: false,
  name: 'Deformer',
  rotationOrigin: {x: 25, y: 75},
  rows: 1,
  visible: true,
}

describe('deformer transform', () => {
  test('should retain an explicit rotation origin independently from the geometry center', () => {
    expect(getDeformerRotationOrigin(deformer)).toEqual({x: 25, y: 75})
    expect(
      getDeformerRotationOrigin({
        ...deformer,
        controlPoints: [0, 0, 200, 0, 0, 100, 100, 100],
      }),
    ).toEqual({x: 25, y: 75})
    expect(getDeformerAngle(deformer)).toBe(0)
  })

  test('should translate every control point', () => {
    expect(
      translateDeformerControlPoints({
        controlPoints: deformer.controlPoints,
        offset: {x: 5, y: -5},
      }),
    ).toEqual([5, -5, 105, -5, 5, 95, 105, 95])
  })

  test('should rotate every control point around the rotation origin', () => {
    const controlPoints = rotateDeformerControlPoints({
      controlPoints: deformer.controlPoints,
      degrees: 90,
      origin: getDeformerRotationOrigin(deformer),
    })
    const rotated = {...deformer, controlPoints}

    expect(getDeformerAngle(rotated)).toBeCloseTo(90)
    expect(controlPoints[0]).toBeCloseTo(100)
    expect(controlPoints[1]).toBeCloseTo(50)
    expect(controlPoints[6]).toBeCloseTo(0)
    expect(controlPoints[7]).toBeCloseTo(150)
  })

  test('should transform curve handle endpoints with the deformer', () => {
    const curveHandles = [
      {
        horizontal: {x: 25, y: 0},
        pointIndex: 0,
        vertical: {x: 0, y: 25},
      },
    ]

    expect(translateDeformerCurveHandles({curveHandles, offset: {x: 5, y: -5}})).toEqual([
      {
        horizontal: {x: 30, y: -5},
        pointIndex: 0,
        vertical: {x: 5, y: 20},
      },
    ])
    const rotated = rotateDeformerCurveHandles({
      curveHandles,
      degrees: 90,
      origin: {x: 0, y: 0},
    })
    expect(rotated?.[0]?.horizontal.x).toBeCloseTo(0)
    expect(rotated?.[0]?.horizontal.y).toBeCloseTo(25)
    expect(rotated?.[0]?.vertical.x).toBeCloseTo(-25)
    expect(rotated?.[0]?.vertical.y).toBeCloseTo(0)
  })

  test('should orient handles toward the grid center from every row and column', () => {
    expect(
      reflectCurveHandlePoint({
        axis: 'horizontal',
        deformer,
        point: {x: 100 / 3, y: 0},
        pointIndex: 0,
      }),
    ).toEqual({x: 100 / 3, y: 0})
    expect(
      reflectCurveHandlePoint({
        axis: 'horizontal',
        deformer,
        point: {x: 400 / 3, y: 0},
        pointIndex: 1,
      }),
    ).toEqual({x: 200 - 400 / 3, y: 0})
    expect(
      reflectCurveHandlePoint({
        axis: 'vertical',
        deformer,
        point: {x: 0, y: 400 / 3},
        pointIndex: 2,
      }),
    ).toEqual({x: 0, y: 200 - 400 / 3})
    expect(
      reflectCurveHandlePoint({
        axis: 'vertical',
        deformer,
        point: {x: 100, y: 400 / 3},
        pointIndex: 3,
      }),
    ).toEqual({x: 100, y: 200 - 400 / 3})

    const denseDeformer = {
      ...deformer,
      columns: 4,
      controlPoints: createDeformerControlPoints({...deformer, columns: 4, rows: 4}),
      rows: 4,
    }
    expect(
      reflectCurveHandlePoint({
        axis: 'horizontal',
        deformer: denseDeformer,
        point: {x: 85, y: 0},
        pointIndex: 3,
      }),
    ).toEqual({x: 65, y: 0})
    expect(
      reflectCurveHandlePoint({
        axis: 'vertical',
        deformer: denseDeformer,
        point: {x: 0, y: 85},
        pointIndex: 15,
      }),
    ).toEqual({x: 0, y: 65})
    expect(
      reflectCurveHandlePoint({
        axis: 'horizontal',
        deformer: denseDeformer,
        point: {x: 60, y: 50},
        pointIndex: 12,
      }),
    ).toEqual({x: 60, y: 50})
  })
})
