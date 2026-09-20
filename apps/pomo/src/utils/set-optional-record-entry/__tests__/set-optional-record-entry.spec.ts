import {expect, it} from 'vitest'

import {setOptionalRecordEntry} from '..'

it('should add and replace entries without changing the input', () => {
  const record = Object.freeze({first: 1, second: 2})
  expect(setOptionalRecordEntry<string, number>(record, 'third', 3)).toEqual({
    first: 1,
    second: 2,
    third: 3,
  })
  expect(setOptionalRecordEntry(record, 'first', 4)).toEqual({first: 4, second: 2})
  expect(record).toEqual({first: 1, second: 2})
})

it('should remove only the requested entry when the value is null', () => {
  const record = Object.freeze({first: 1, second: 2})
  expect(setOptionalRecordEntry(record, 'first', null)).toEqual({second: 2})
  expect(setOptionalRecordEntry<string, number>(record, 'missing', null)).toEqual(record)
  expect(record).toEqual({first: 1, second: 2})
})

it('should retain falsy values and collection references', () => {
  expect(setOptionalRecordEntry({}, 'enabled', false)).toEqual({enabled: false})
  expect(setOptionalRecordEntry({}, 'count', 0)).toEqual({count: 0})
  expect(setOptionalRecordEntry({}, 'label', '')).toEqual({label: ''})
  const values: readonly string[] = []
  expect(setOptionalRecordEntry({}, 'values', values).values).toBe(values)
})

it('should treat prototype-like keys as own entries', () => {
  const value = {enabled: true}
  const record = setOptionalRecordEntry({}, '__proto__', value)
  expect(Object.hasOwn(record, '__proto__')).toBe(true)
  expect(Reflect.get(record, '__proto__')).toBe(value)
  expect(Object.getPrototypeOf(record)).toBe(Object.prototype)
})
