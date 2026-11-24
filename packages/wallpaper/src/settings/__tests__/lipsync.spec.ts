import {expect, it} from 'vitest'
import {poffoLipSyncSchema} from '../lipsync'

it('should persist microphone selection and its noise threshold without changing legacy settings', () => {
  const saved = {
    gain: 3,
    microphone: {deviceId: 'studio-mic', threshold: 0.2},
    source: 'microphone',
  }
  expect(poffoLipSyncSchema.parse(saved)).toEqual(saved)
  expect(poffoLipSyncSchema.parse({source: 'voice'})).toEqual({source: 'voice'})
  expect(poffoLipSyncSchema.safeParse({...saved, microphone: {threshold: 1.1}}).success).toBe(false)
})

it('should preserve separate mouth shapes without migrating a legacy opening into a vowel', () => {
  const saved = {
    parameterId: 'old-opening',
    shapes: {
      a: {parameterId: 'a'},
      closed: {parameterId: null},
      e: {inverted: true, parameterId: 'e'},
    },
    source: 'voice',
  }
  expect(poffoLipSyncSchema.parse(saved)).toEqual(saved)
  expect(
    poffoLipSyncSchema.safeParse({shapes: {unknown: {parameterId: 'x'}}, source: 'voice'}).success,
  ).toBe(false)
})
