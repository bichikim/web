/** @vitest-environment node */
import {expect, expectTypeOf, it} from 'vitest'

import classifierArtifact from '../classifier-artifact.json'
import {
  getPrimaryMood,
  MOOD_MODIFIER_IDS,
  MOOD_MODIFIERS,
  PRIMARY_MOOD_IDS,
  PRIMARY_MOODS,
} from '../labels'

const EXPECTED_PRIMARY_MOOD_IDS = [
  'cheerful',
  'calm',
  'warm',
  'hopeful',
  'dreamlike',
  'awe',
  'nostalgic',
  'sad',
  'anxious',
  'fearful',
  'angry',
  'neutral',
] as const
const EXPECTED_MODIFIER_IDS = ['playful', 'sarcastic'] as const

it('should preserve the ordered primary tuple used by the trained classifier', () => {
  expectTypeOf(PRIMARY_MOOD_IDS).toEqualTypeOf<typeof EXPECTED_PRIMARY_MOOD_IDS>()
  expect(PRIMARY_MOOD_IDS).toEqual(EXPECTED_PRIMARY_MOOD_IDS)
  expect(PRIMARY_MOOD_IDS).toEqual(classifierArtifact.labels)
})

it('should preserve the ordered modifier tuple and its definitions', () => {
  expectTypeOf(MOOD_MODIFIER_IDS).toEqualTypeOf<typeof EXPECTED_MODIFIER_IDS>()
  expect(MOOD_MODIFIER_IDS).toEqual(EXPECTED_MODIFIER_IDS)
  expect(MOOD_MODIFIERS.map((modifier) => modifier.id)).toEqual(EXPECTED_MODIFIER_IDS)
})

it('should resolve every primary mood definition by id', () => {
  expect(PRIMARY_MOOD_IDS.map((id) => getPrimaryMood(id))).toEqual(PRIMARY_MOODS)
})

it('should reject an unknown primary mood id', () => {
  expect(() => getPrimaryMood('missing' as never)).toThrow('Unknown primary mood: missing')
})
