import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {rebindDeformer} from '../binding'
import {transformDeformerPoint} from '../grid'

const grid: PuppetSceneDeformerNode = {
  bounds: {width: 100, x: 0, height: 100, y: 0},
  children: [],
  columns: 1,
  id: 'grid',
  kind: 'deformer',
  rows: 1,
  locked: false,
  name: 'Grid',
  controlPoints: [10, 20, 110, 20, 10, 120, 110, 120],
  visible: true,
}
const curve: PuppetSceneDeformerNode = {
  ...grid,
  controlPoints: [0, 50, 30, 80, 70, 80, 100, 50],
  curveAxis: 'x',
}
const bone: PuppetSceneDeformerNode = {
  ...grid,
  boneRestPoints: [0, 0, 100, 0],
  controlPoints: [10, 20, 10, 120],
}
const points = [
  {x: 10, y: 10},
  {x: 40, y: 50},
  {x: 90, y: 80},
]

test.each([grid, curve, bone])(
  'should preserve existing deformation when rebinding $id',
  (before) => {
    const moved = before.controlPoints.map((value, index) => value + (index % 2 === 0 ? 15 : 5))
    const after = rebindDeformer(before, {
      ...before,
      boneRestPoints: before.boneRestPoints === undefined ? undefined : moved,
      controlPoints: moved,
    })
    for (const point of points) {
      expect(transformDeformerPoint(after, point)).toEqual(transformDeformerPoint(before, point))
    }
    const restored: PuppetSceneDeformerNode = JSON.parse(JSON.stringify(after))
    for (const point of points) {
      expect(transformDeformerPoint(restored, point)).toEqual(transformDeformerPoint(before, point))
    }
  },
)

test.each([grid, curve, bone])(
  'should apply deformation relative to the relocated controls $id',
  (before) => {
    const bound = rebindDeformer(before, {...before})
    const after = {
      ...bound,
      controlPoints: bound.controlPoints.map((value, index) => value + (index % 2 === 0 ? 5 : 7)),
    }
    for (const point of points) {
      const expected = transformDeformerPoint(before, point)
      const actual = transformDeformerPoint(after, point)
      expect(actual.x).toBeCloseTo(expected.x + 5, 3)
      expect(actual.y).toBeCloseTo(expected.y + 7, 3)
    }
  },
)

test('should coalesce consecutive placement edits and preserve subsequent rebindings', () => {
  let current = grid
  for (let index = 0; index < 100; index += 1) {
    current = rebindDeformer(current, {
      ...current,
      controlPoints: current.controlPoints.map((value) => value + 1),
    })
  }
  expect(current.binding?.steps).toHaveLength(1)
  const posed = {...current, controlPoints: current.controlPoints.map((value) => value + 10)}
  const rebound = rebindDeformer(posed, {
    ...posed,
    controlPoints: posed.controlPoints.map((value) => value + 20),
  })
  for (const point of points) {
    expect(transformDeformerPoint(rebound, point)).toEqual(transformDeformerPoint(posed, point))
  }
  expect(rebound.binding?.steps).toHaveLength(2)
})

test('should preserve a collapsed layout and apply translation without an inverse jump', () => {
  const bound = rebindDeformer(grid, {...grid, controlPoints: [50, 50, 50, 50, 50, 50, 50, 50]})
  const posed = {...bound, controlPoints: bound.controlPoints.map((value) => value + 1)}
  for (const point of points) {
    const expected = transformDeformerPoint(grid, point)
    expect(transformDeformerPoint(bound, point)).toEqual(expected)
    const actual = transformDeformerPoint(posed, point)
    expect(actual.x).toBeCloseTo(expected.x + 1)
    expect(actual.y).toBeCloseTo(expected.y + 1)
  }
})
