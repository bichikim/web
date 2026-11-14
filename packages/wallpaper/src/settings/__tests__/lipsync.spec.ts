import {expect, it} from 'vitest'
import {poffoLipSyncSchema} from '../lipsync'

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
