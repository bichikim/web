import {expect, it} from 'vitest'
import {validateCheckpoint} from '../index'

it('should reject checkpoints from a different model even with matching shapes', () => {
  expect(() =>
    validateCheckpoint(
      {modelId: 'other', parameters: new Float32Array([1, 2]), steps: 1, version: 1},
      'base',
      2,
    ),
  ).toThrow(/model/)
})

it('should reject invalid parameter values and counts before loading weights', () => {
  const checkpoint = {
    modelId: 'base',
    parameters: new Float32Array([NaN, 2]),
    steps: 0,
    version: 1,
  } as const
  expect(() => validateCheckpoint(checkpoint, 'base', 2)).toThrow(/finite/)
  expect(() =>
    validateCheckpoint({...checkpoint, parameters: new Float32Array([1])}, 'base', 2),
  ).toThrow(/count/)
})
