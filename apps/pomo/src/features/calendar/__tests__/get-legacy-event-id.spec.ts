import {expect, it} from 'vitest'

import {getLegacyEventId} from '../get-legacy-event-id'

it('should recover the old Google identity without using the calendar label', () => {
  expect(getLegacyEventId({id: 'connection:["work","abcde12345"]', provider: 'google'})).toBe(
    'connection:abcde12345',
  )
})

it.each([
  'unscoped',
  ':[]',
  'connection:abcde12345',
  'connection:["work"]',
  'connection:["work",42]',
  'connection:invalid',
  'connection:["work","abcde12345","extra"]',
])('should ignore unscoped or malformed identity %s', (id) => {
  expect(getLegacyEventId({id, provider: 'google'})).toBeNull()
})

it('should not reinterpret another provider identity', () => {
  expect(
    getLegacyEventId({id: 'connection:["work","abcde12345"]', provider: 'microsoft'}),
  ).toBeNull()
})
