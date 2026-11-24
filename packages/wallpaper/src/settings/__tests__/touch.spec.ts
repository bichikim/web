import {expect, it} from 'vitest'
import {DEFAULT_POFFO_TOUCH, poffoTouchSchema} from '../touch'
import {DEFAULT_POFFO_SPEECH, poffoSpeechSchema} from '../library-model'

it('should preserve touch controls and reject nonfinite or out of range input', () => {
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [['shoulder', 'elbow', 'wrist']] as const,
    enabled: true,
    inverseKinematics: true,
    jointResponse: {elbow: 0.6, shoulder: 0.25, wrist: 1},
    parameters: {head: {axis: 'z' as const, gain: 0.5, invert: true}},
  }
  expect(poffoSpeechSchema.parse({...DEFAULT_POFFO_SPEECH, touch}).touch).toEqual(touch)
  expect(poffoTouchSchema.safeParse({...touch, amount: Number.NaN}).success).toBe(false)
  expect(poffoTouchSchema.safeParse({...touch, distance: 0}).success).toBe(false)
  expect(poffoTouchSchema.safeParse({...touch, returnDuration: -1}).success).toBe(false)
  expect(
    poffoTouchSchema.safeParse({...touch, jointResponse: {elbow: 0.6, shoulder: NaN, wrist: 1}})
      .success,
  ).toBe(false)
  expect(poffoTouchSchema.safeParse({...touch, chains: [['shoulder', 'elbow']]}).success).toBe(
    false,
  )
  expect(
    poffoTouchSchema.safeParse({...touch, parameters: {head: {axis: 'rotation'}}}).success,
  ).toBe(false)
})

it('should retain named joint drafts, assignments and individual response settings', () => {
  const chains = [
    {
      enabled: true,
      id: 'a',
      name: '내 팔',
      parameters: {shoulder: 'rotate-a'},
      response: {elbow: 0.6, shoulder: 0.2, wrist: 1},
    },
  ]
  expect(poffoTouchSchema.parse({...DEFAULT_POFFO_TOUCH, chains}).chains).toEqual(chains)
})
