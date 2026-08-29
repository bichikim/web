import {expect, it} from 'vitest'

import {getPrimaryMood, PRIMARY_MOOD_IDS, PRIMARY_MOODS} from '../labels'

it('should resolve every primary mood definition by id', () => {
  expect(PRIMARY_MOOD_IDS.map((id) => getPrimaryMood(id))).toEqual(PRIMARY_MOODS)
})

it('should reject an unknown primary mood id', () => {
  expect(() => getPrimaryMood('missing' as never)).toThrow('Unknown primary mood: missing')
})
