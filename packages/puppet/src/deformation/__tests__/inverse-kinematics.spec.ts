import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {solveBoneIk} from '../inverse-kinematics'

const node: PuppetSceneDeformerNode = {
  boneRestPoints: [0, 0, 50, 0, 100, 0],
  bounds: {width: 100, x: 0, height: 100, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 50, 0, 100, 0],
  id: 'bone',
  kind: 'deformer',
  locked: false,
  rows: 1,
  name: 'Bone',
  visible: true,
}
test.each([
  {x: 50, y: 50},
  {x: 60, y: 0},
  {x: 0, y: 0},
  {x: -30, y: 40},
])(
  'should reach $x $y from a straight chain without moving the root or stretching bones',
  (point) => {
    const pose = solveBoneIk({node, point})
    expect(pose.slice(0, 2)).toEqual([0, 0])
    expect(Math.hypot(pose[2]!, pose[3]!)).toBeCloseTo(50)
    expect(Math.hypot(pose[4]! - pose[2]!, pose[5]! - pose[3]!)).toBeCloseTo(50)
    expect(Math.hypot(pose[4]! - point.x, pose[5]! - point.y)).toBeLessThan(0.05)
    expect(node.controlPoints).toEqual([0, 0, 50, 0, 100, 0])
  },
)
test('should extend toward an unreachable target without stretching', () => {
  const pose = solveBoneIk({node, point: {x: 0, y: 200}})
  expect(pose[4]).toBeCloseTo(0)
  expect(pose[5]).toBeCloseTo(100)
})
test('should handle a single bone and reject nonfinite targets', () => {
  const single = {...node, boneRestPoints: [0, 0, 50, 0], controlPoints: [0, 0, 50, 0]}
  expect(solveBoneIk({node: single, point: {x: 0, y: 70}})).toEqual([0, 0, 0, 50])
  expect(solveBoneIk({node, point: {x: NaN, y: 0}})).toEqual(node.controlPoints)
})
