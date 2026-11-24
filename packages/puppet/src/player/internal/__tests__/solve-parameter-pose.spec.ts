import {expect, test} from 'vitest'
import {solveParameterPose} from '../solve-parameter-pose'

const parameters = ['shoulder', 'elbow', 'wrist'].map((id) => ({
  defaultValue: 0,
  id,
  maximum: Math.PI,
  minimum: -Math.PI,
}))
const sample = (values: Readonly<Record<string, number>>) => {
  const shoulder = values.shoulder ?? 0
  const elbow = shoulder + (values.elbow ?? 0)
  return {
    angle: elbow + (values.wrist ?? 0),
    x: Math.cos(shoulder) * 100 + Math.cos(elbow) * 80,
    y: Math.sin(shoulder) * 100 + Math.sin(elbow) * 80,
  }
}

test('should bend both joints toward an XY target and retain the hand orientation', () => {
  const target = {angle: 0, x: 110, y: 65}
  const values = solveParameterPose({
    angleScale: 40,
    parameters,
    sample,
    target,
    values: {elbow: 0.1, shoulder: 0, wrist: -0.1},
  })
  const pose = sample(values)
  expect(pose.x).toBeCloseTo(target.x, 0)
  expect(pose.y).toBeCloseTo(target.y, 0)
  expect(pose.angle).toBeCloseTo(target.angle, 2)
  expect(Math.abs(values.elbow!)).toBeGreaterThan(0.5)
})

test('should handle a straight chain and an unreachable target without exceeding joint limits', () => {
  const values = solveParameterPose({
    angleScale: 40,
    parameters,
    sample,
    target: {angle: 0, x: 100, y: 0},
    values: {elbow: 0, shoulder: 0, wrist: 0},
  })
  expect(sample(values).x).toBeCloseTo(100, 0)
  const limited = solveParameterPose({
    angleScale: 40,
    parameters,
    sample,
    target: {angle: 0, x: 900, y: 300},
    values,
  })
  const pose = sample(limited)
  expect(Math.hypot(pose.x, pose.y)).toBeLessThanOrEqual(180.00001)
  parameters.forEach(({id, minimum, maximum}) => {
    expect(limited[id]).toBeGreaterThanOrEqual(minimum)
    expect(limited[id]).toBeLessThanOrEqual(maximum)
  })
})

test('should leave stationary or invalid targets unchanged and preserve unrelated inputs', () => {
  const values = {elbow: 0.8, shoulder: 0.3, smile: 0.7, wrist: -1.1}
  expect(
    solveParameterPose({angleScale: 40, parameters, sample, target: sample(values), values}),
  ).toEqual(values)
  expect(
    solveParameterPose({
      angleScale: 40,
      parameters,
      sample,
      target: {angle: 0, x: NaN, y: 10},
      values,
    }),
  ).toEqual(values)
})

test('should favor more mobile joints and keep a zero-mobility joint fixed', () => {
  const samplePosition = (values: Readonly<Record<string, number>>) => ({
    angle: 0,
    x: values.shoulder! + values.elbow! + values.wrist!,
    y: 0,
  })
  const values = {elbow: 0, shoulder: 0, wrist: 0}
  const solve = (mobility: readonly number[]) =>
    solveParameterPose({
      angleScale: 0,
      mobility,
      parameters,
      sample: samplePosition,
      target: {angle: 0, x: 1, y: 0},
      values,
    })
  const weighted = solve([0.1, 0.4, 1])
  expect(samplePosition(weighted).x).toBeCloseTo(1, 3)
  expect(weighted.wrist).toBeGreaterThan(weighted.elbow!)
  expect(weighted.elbow).toBeGreaterThan(weighted.shoulder!)
  const locked = solve([0, 0.4, 1])
  expect(locked.shoulder).toBe(0)
  expect(samplePosition(locked).x).toBeCloseTo(1, 3)
})

test('should solve four linked joints and a two-joint straight chain without stretching their links', () => {
  const joints = ['a', 'b', 'c', 'd'].map((id) => ({
    defaultValue: 0,
    id,
    maximum: Math.PI,
    minimum: -Math.PI,
  }))
  const sampleChain = (values: Readonly<Record<string, number>>) => {
    let angle = 0
    let x = 0
    let y = 0
    for (const joint of joints) {
      angle += values[joint.id] ?? 0
      x += Math.cos(angle) * 50
      y += Math.sin(angle) * 50
    }
    return {angle, x, y}
  }
  const target = sampleChain({a: 0.3, b: -0.8, c: 0.5, d: 0.4})
  const solved = solveParameterPose({
    angleScale: 0,
    parameters: joints,
    sample: sampleChain,
    target,
    values: {},
  })
  expect(
    Math.hypot(sampleChain(solved).x - target.x, sampleChain(solved).y - target.y),
  ).toBeLessThan(0.1)
  const pair = joints.slice(0, 2)
  const samplePair = (values: Readonly<Record<string, number>>) => ({
    angle: 0,
    x: Math.cos(values.a ?? 0) * 50 + Math.cos((values.a ?? 0) + (values.b ?? 0)) * 50,
    y: Math.sin(values.a ?? 0) * 50 + Math.sin((values.a ?? 0) + (values.b ?? 0)) * 50,
  })
  const folded = solveParameterPose({
    angleScale: 0,
    parameters: pair,
    sample: samplePair,
    target: {angle: 0, x: 60, y: 0},
    values: {},
  })
  expect(samplePair(folded).x).toBeCloseTo(60, 0)
  expect(Math.hypot(samplePair(folded).x, samplePair(folded).y)).toBeLessThanOrEqual(100)
})
