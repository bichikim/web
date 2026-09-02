import {describe, expect, test} from 'vitest'

import type {PuppetSceneDeformerNode} from '../../../player'
import {
  getDeformerAngle,
  getDeformerCenter,
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
  rows: 1,
  visible: true,
}

describe('deformer transform', () => {
  test('should derive the center and top-edge angle', () => {
    expect(getDeformerCenter(deformer)).toEqual({x: 50, y: 50})
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

  test('should rotate every control point around a shared center', () => {
    const controlPoints = rotateDeformerControlPoints({
      controlPoints: deformer.controlPoints,
      degrees: 90,
      origin: getDeformerCenter(deformer),
    })
    const rotated = {...deformer, controlPoints}

    expect(getDeformerAngle(rotated)).toBeCloseTo(90)
    expect(controlPoints[0]).toBeCloseTo(100)
    expect(controlPoints[1]).toBeCloseTo(0)
    expect(controlPoints[6]).toBeCloseTo(0)
    expect(controlPoints[7]).toBeCloseTo(100)
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
})
