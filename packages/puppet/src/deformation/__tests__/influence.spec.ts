import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player/create-demo-document'
import {getBindingInfluence, sampleInfluence} from '../influence'

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

test('should multiply independent slice weights only when requested', () => {
  const document = createDemoDocument()
  const binding = document.parameterBindings![0]!
  const influences = [
    {parameterId: binding.parameterIds[0]!, points: [{value: 0, weight: 0.8}]},
    {parameterId: binding.parameterIds[1]!, points: [{value: 0, weight: 0.5}]},
  ]
  expect(
    getBindingInfluence({binding: {...binding, influenceMode: 'multiply', influences}, document}),
  ).toBeCloseTo(0.4)
  expect(
    getBindingInfluence({binding: {...binding, influenceMode: 'minimum', influences}, document}),
  ).toBe(0.5)
})
