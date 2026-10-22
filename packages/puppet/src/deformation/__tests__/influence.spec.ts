import {expect, test} from 'vitest'
import {sampleInfluence} from '../influence'

test('should apply native absolute key snapping to blend shape constraints without changing legacy curves', () => {
  const relation = {
    parameterId: 'p',
    points: [
      {value: 0, weight: 1},
      {value: 1, weight: 0},
    ],
  }
  expect(sampleInfluence(relation, 0.0005)).toBe(0.9995)
  expect(
    sampleInfluence(relation, 0.0005, {
      continuousPrecision: 'float32',
      keyTolerance: 0.001,
      keyToleranceUnit: 'parameter',
    }),
  ).toBe(1)
})
