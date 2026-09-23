import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {createPhysicsState, evaluatePhysics} from '../physics'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model tail physics', () => {
  test.each([-1, 1])(
    'should lag, overshoot, rebound and settle after yaw reversal with idle=%s',
    (idle) => {
      let physicsState = createPhysicsState(model)
      const sample = (yaw: number) => {
        const result = evaluatePhysics({
          deltaTime: 1 / 60,
          document: model,
          parameterValues: {'full-body-x': yaw, 'tail-sway': idle},
          physicsState,
        })
        physicsState = result.physicsState
        expect(result.parameterValues['tail-sway']).toBe(idle)
        return result.parameterValues['tail-physics-x']!
      }
      const step = Array.from({length: 300}, () => sample(22))
      expect(Math.abs(step[0]!)).toBeLessThan(0.02)
      expect(Math.min(...step)).toBeLessThan(-0.65)
      expect(Math.min(...step)).toBeGreaterThan(-0.9)
      expect(step.at(-1)).toBeCloseTo(-0.55, 3)
      const reverse = Array.from({length: 300}, () => sample(-22))
      expect(reverse[0]).toBeLessThan(-0.5)
      expect(Math.max(...reverse)).toBeGreaterThan(0.75)
      expect(Math.max(...reverse)).toBeLessThan(1)
      expect(reverse.at(-1)).toBeCloseTo(0.55, 3)
      const released = Array.from({length: 300}, () => sample(0))
      expect(released[0]).toBeGreaterThan(0.5)
      expect(Math.min(...released)).toBeLessThan(-0.1)
      expect(released.at(-1)).toBeCloseTo(0, 3)
    },
  )
})
