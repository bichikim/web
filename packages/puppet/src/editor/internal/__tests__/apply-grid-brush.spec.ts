import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../../player'
import {applyGridBrush} from '../apply-grid-brush'

const node: PuppetSceneDeformerNode = {
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
  curveHandles: [{horizontal: {x: 10, y: 0}, pointIndex: 0, vertical: {x: 0, y: 10}}],
  id: 'grid',
  kind: 'deformer',
  locked: false,
  name: 'Grid',
  rows: 1,
  visible: true,
}
const identity = (point: {x: number; y: number}) => point
const settings = {
  center: {x: 50, y: 50},
  delta: {x: 10, y: -5},
  hardness: 1,
  node,
  radius: 100,
  strength: 1,
  transform: identity,
  untransform: identity,
}

test('should move boundary points and their handles without changing the source', () => {
  const result = applyGridBrush({...settings, mode: 'move'})
  expect(result.controlPoints).toEqual([10, -5, 110, -5, 10, 95, 110, 95])
  expect(result.curveHandles?.[0]).toEqual({
    horizontal: {x: 20, y: -5},
    pointIndex: 0,
    vertical: {x: 10, y: 5},
  })
  expect(node.controlPoints).toEqual([0, 0, 100, 0, 0, 100, 100, 100])
})

test.each([
  {delta: 25, first: -12.5, last: 112.5},
  {delta: -25, first: 12.5, last: 87.5},
])(
  'should expand or contract around the stroke center with delta $delta',
  ({delta, first, last}) => {
    const result = applyGridBrush({...settings, delta: {x: delta, y: 0}, mode: 'expand'})
    expect(result.controlPoints).toEqual([first, first, last, first, first, last, last, last])
  },
)

test('should use displayed distance and convert the displacement through scaled ancestors', () => {
  const result = applyGridBrush({
    ...settings,
    center: {x: 200, y: 150},
    delta: {x: 20, y: -10},
    mode: 'move',
    radius: 200,
    transform: (point) => ({x: point.x * 2 + 100, y: point.y * 2 + 50}),
    untransform: (point) => ({x: (point.x - 100) / 2, y: (point.y - 50) / 2}),
  })
  expect(result.controlPoints).toEqual([10, -5, 110, -5, 10, 95, 110, 95])
  expect(applyGridBrush({...settings, mode: 'move', radius: 10}).controlPoints).toEqual(
    node.controlPoints,
  )
})
