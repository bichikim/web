import {expect, test} from 'vitest'
import {isDeformer} from '../parse-deformer'

const shape = {
  bounds: {width: 100, height: 100, x: 0, y: 0},
  columns: 1,
  controlPoints: [50, 50],
  pins: [{radius: 40, x: 50, strength: 1, y: 50}],
  rows: 1,
}

test('should accept pin shapes and reject invalid influence data or mixed deformer kinds', () => {
  expect(isDeformer(shape)).toBe(true)
  for (const changed of [
    {pins: []},
    {controlPoints: [0]},
    {columns: 2},
    {curveAxis: 'x'},
    {boneRestPoints: [0, 0, 10, 10]},
    ...[0, -1, Infinity].map((radius) => ({pins: [{...shape.pins[0], radius}]})),
    ...[-1, 1.1, NaN].map((strength) => ({pins: [{...shape.pins[0], strength}]})),
  ]) {
    expect(isDeformer({...shape, ...changed})).toBe(false)
  }
})
