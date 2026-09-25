import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {sampleMotionParameterValues} from '../motion'
import {createPhysicsState, evaluatePhysics} from '../physics'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const idle = model.motions.find((motion) => motion.id === 'idle')!
const sample = (time: number) =>
  sampleMotionParameterValues({
    motion: idle,
    parameters: model.parameters,
    parameterValues: {},
    time,
  })

describe('development model idle motion', () => {
  test.each([
    {maximum: 4.5, minimum: -4, parameterId: 'body-x', peak: 2.2, trough: 5.5},
    {maximum: 2.6, minimum: -2.2, parameterId: 'full-body-x', peak: 2.9, trough: 6.3},
  ])('should move $parameterId gently with continuous loop value and velocity', (options) => {
    const {parameterId, minimum, maximum, peak, trough} = options
    const track = idle.tracks.find(
      (candidate) => candidate.kind === 'parameter' && candidate.parameterId === parameterId,
    )!
    expect(track).toBeDefined()
    const values = Array.from({length: 541}, (_, frame) => sample(frame / 60)[parameterId]!)
    expect(Math.min(...values)).toBeCloseTo(minimum, 4)
    expect(Math.max(...values)).toBeCloseTo(maximum, 4)
    expect(sample(peak)[parameterId]).toBeCloseTo(maximum, 8)
    expect(sample(trough)[parameterId]).toBeCloseTo(minimum, 8)
    expect(values[0]).toBe(0)
    expect(values.at(-1)).toBe(values[0])
    const steps = values.slice(1).map((value, index) => value - values[index]!)
    expect(Math.max(...steps.map(Math.abs))).toBeLessThan(0.14)
    const acceleration = steps.slice(1).map((step, index) => Math.abs(step - steps[index]!))
    expect(Math.max(...acceleration)).toBeLessThan(0.006)
    for (const keyframe of track.keyframes) {
      const time = keyframe.time % idle.duration
      const before = (time - 0.001 + idle.duration) % idle.duration
      const after = (time + 0.001) % idle.duration
      const velocityBefore = (sample(time)[parameterId]! - sample(before)[parameterId]!) / 0.001
      const velocityAfter = (sample(after)[parameterId]! - sample(time)[parameterId]!) / 0.001
      expect(velocityBefore).toBeCloseTo(velocityAfter, 4)
    }
  })

  test('should retain the nine-second facial, gaze, blink, breath and tail motion', () => {
    expect(idle.duration).toBe(9)
    expect(idle.tracks.map((track) => track.kind === 'parameter' && track.parameterId)).toEqual(
      expect.arrayContaining([
        'face-x',
        'face-y',
        'gaze-x',
        'gaze-y',
        'eye-close-left',
        'eye-close-right',
        'mouth-shape',
        'mouth-open',
        'breath',
        'tail-sway',
      ]),
    )
    expect(sample(1.5)['face-x']).toBe(6)
    expect(sample(4.75)['face-x']).toBe(-7)
    expect(sample(1.75).breath).toBe(0.9)
    expect(sample(6.25).breath).toBe(0.85)
    expect(sample(1.8)['tail-sway']).toBe(0.46)
    expect(sample(5.35)['tail-sway']).toBeCloseTo(-0.31, 8)
  })

  test('should layer yaw-driven tail physics over idle without replacing authored tail sway', () => {
    let physicsState = createPhysicsState(model)
    const tailValues = Array.from({length: 1080}, (_, frame) => {
      const parameterValues = sample((frame / 60) % idle.duration)
      const result = evaluatePhysics({
        deltaTime: 1 / 60,
        document: model,
        parameterValues,
        physicsState,
      })
      physicsState = result.physicsState
      expect(result.parameterValues['tail-sway']).toBe(parameterValues['tail-sway'])
      return result.parameterValues['tail-physics-x']!
    })
    expect(Math.min(...tailValues)).toBeLessThan(-0.05)
    expect(Math.max(...tailValues)).toBeGreaterThan(0.04)
    expect(Math.max(...tailValues.map(Math.abs))).toBeLessThan(0.1)
    const steps = tailValues.slice(1).map((value, index) => Math.abs(value - tailValues[index]!))
    expect(Math.max(...steps)).toBeLessThan(0.004)
  })
})
