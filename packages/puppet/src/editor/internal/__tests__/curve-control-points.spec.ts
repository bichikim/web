import {expect, test} from 'vitest'
import {moveCurveHandles} from '../curve-control-points'

test('should move both adjacent handles with an internal knot', () => {
  const controlPoints = [0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0]
  const result = moveCurveHandles({controlPoints, offsetX: 1, offsetY: 2, pointIndex: 3})
  expect(result).toEqual([0, 0, 1, 0, 3, 2, 3, 0, 5, 2, 5, 0, 6, 0])
  expect(controlPoints).toEqual([0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0])
})
