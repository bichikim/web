import {expect, it} from 'vitest'
import {frameValues} from '../frame-values'

const options = {
  automatic: ['a', 'i', 'u', 'e', 'o', 'closed'] as const,
  connections: [],
  pair: {
    form: {defaultValue: 0, id: 'ParamMouthForm', maximum: 1, minimum: -1},
    opening: {defaultValue: 0, id: 'ParamMouthOpenY', maximum: 1, minimum: 0},
  },
  resting: {ParamMouthForm: 0, ParamMouthOpenY: 0},
  settings: {gain: 3, source: 'voice' as const},
}
it('should prepare the mouth form without opening the jaw during silent lead-in', () => {
  expect(
    frameValues(
      {
        level: 0,
        motion: {phase: 'prepare', weight: 0.3},
        openingWeights: {},
        source: 'voice',
        weights: {o: 1},
        widgetId: 'one',
      },
      options,
    ),
  ).toEqual({ParamMouthForm: -0.18, ParamMouthOpenY: 0})
})
it('should preserve the rendered form during a hold and relax from that exact value', () => {
  const frame = {
    level: 0,
    openingWeights: {},
    source: 'voice' as const,
    weights: {o: 1},
    widgetId: 'one',
  }
  expect(
    frameValues({...frame, motion: {phase: 'hold', weight: 1}}, {...options, formOrigin: -0.4}),
  ).toEqual({ParamMouthForm: -0.4, ParamMouthOpenY: 0})
  expect(
    frameValues(
      {...frame, motion: {phase: 'release', weight: 0.5}},
      {...options, formOrigin: -0.4},
    ),
  ).toEqual({ParamMouthForm: -0.2, ParamMouthOpenY: 0})
})
it('should apply the same opening signal while the form is held or released', () => {
  const frame = {
    level: 0.3,
    openingWeights: {a: 0.5, i: 0.5},
    source: 'voice' as const,
    weights: {o: 1},
    widgetId: 'one',
  }
  const original = frameValues(frame, options)
  expect(
    frameValues({...frame, motion: {phase: 'release', weight: 0.5}}, {...options, formOrigin: -0.4})
      .ParamMouthOpenY,
  ).toBe(original.ParamMouthOpenY)
})
