import {expect, test} from 'vitest'
import type {PuppetDeformerShape} from '../../player/document'
import {transformPinPoint} from '../pin'

const node: PuppetDeformerShape = {
  bounds: {x: 0, width: 100, y: 0, height: 100},
  columns: 1,
  pins: [{x: 50, y: 50, radius: 40, strength: 1}],
  rows: 1,
  controlPoints: [70, 60],
}

test('should move the pin center and smoothly fade to zero at the radius', () => {
  expect(transformPinPoint(node, {x: 50, y: 50})).toEqual({x: 70, y: 60})
  expect(transformPinPoint(node, {x: 70, y: 50})).toEqual({x: 80, y: 55})
  expect(transformPinPoint(node, {x: 90, y: 50})).toEqual({x: 90, y: 50})
  expect(transformPinPoint(node, {x: 100, y: 50})).toEqual({x: 100, y: 50})
})

test('should respect strength and bound overlapping influences', () => {
  expect(
    transformPinPoint({...node, pins: [{...node.pins![0]!, strength: 0.5}]}, {x: 50, y: 50}),
  ).toEqual({x: 60, y: 55})
  const overlap = {...node, controlPoints: [70, 60, 70, 60], pins: [node.pins![0]!, node.pins![0]!]}
  expect(transformPinPoint(overlap, {x: 50, y: 50})).toEqual({x: 70, y: 60})
  expect(transformPinPoint({...node, controlPoints: [50, 50]}, {x: 60, y: 60})).toEqual({
    x: 60,
    y: 60,
  })
})
