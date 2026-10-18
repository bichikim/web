import {expect, it} from 'vitest'
import {z} from 'zod'
import {createTimestampedFieldCodec} from '..'

it('should migrate legacy values and preserve the persisted field name and timestamp', () => {
  const codec = createTimestampedFieldCodec('delay', z.enum(['off', '10m']))
  expect(codec.parseStored('10m')).toEqual({delay: '10m', savedAt: 0})
  expect(codec.parseStored({delay: 'off', savedAt: 2})).toEqual({delay: 'off', savedAt: 2})
  expect(codec.toStored('off', 3)).toEqual({delay: 'off', savedAt: 3})
  expect(codec.toValue({delay: '10m', savedAt: 4})).toBe('10m')
  expect(codec.parseValue('other')).toBeNull()
})
it.each([-1, NaN, Infinity])('should reject malformed timestamps %s', (savedAt) => {
  const codec = createTimestampedFieldCodec('preference', z.enum(['dark', 'bright']))
  expect(codec.parseStored({preference: 'dark', savedAt})).toBeNull()
})
