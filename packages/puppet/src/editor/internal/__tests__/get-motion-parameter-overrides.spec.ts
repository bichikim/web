import {expect, test} from 'vitest'
import {getMotionParameterOverrides} from '../get-motion-parameter-overrides'
import {createEmptyDocument} from '../../../player'

test('should leave animated parameters to the motion and retain unrelated editor values', () => {
  const document = {
    ...createEmptyDocument(),
    motions: [
      {
        duration: 1,
        id: 'idle',
        tracks: [
          {keyframes: [{time: 0, value: 1}], kind: 'parameter' as const, parameterId: 'angle'},
          {keyframes: [], kind: 'parameter' as const, parameterId: 'empty'},
        ],
      },
    ],
  }
  const parameterValues = {angle: 0, empty: 0.3, mouth: 0.5}
  expect(getMotionParameterOverrides({document, parameterValues})).toEqual({empty: 0.3, mouth: 0.5})
  expect(getMotionParameterOverrides({document, motionId: 'missing', parameterValues})).toEqual(
    parameterValues,
  )
})
