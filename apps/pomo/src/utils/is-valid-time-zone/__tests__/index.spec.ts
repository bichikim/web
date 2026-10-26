/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

let isValidTimeZone: typeof import('..').isValidTimeZone
const NativeDateTimeFormat = Intl.DateTimeFormat

const spyDateTimeFormat = () =>
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function spyDateTimeFormat(locales, options) {
    return new NativeDateTimeFormat(locales, options)
  })

beforeEach(async () => {
  vi.resetModules()
  isValidTimeZone = (await import('..')).isValidTimeZone
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isValidTimeZone', () => {
  it.each([
    ['Asia/Seoul', true],
    ['UTC', true],
    ['Invalid/TimeZone', false],
    ['', false],
  ] as const)('should validate %j as %s', (timeZone, expected) => {
    expect(isValidTimeZone(timeZone)).toBe(expected)
  })

  it('should reuse a successful validation for the same time zone', () => {
    const constructor = spyDateTimeFormat()

    expect(isValidTimeZone('Asia/Seoul')).toBe(true)
    expect(isValidTimeZone('Asia/Seoul')).toBe(true)
    expect(constructor).toHaveBeenCalledTimes(1)
  })

  it('should reuse a failed validation for the same time zone', () => {
    const constructor = spyDateTimeFormat()

    expect(isValidTimeZone('Invalid/TimeZone')).toBe(false)
    expect(isValidTimeZone('Invalid/TimeZone')).toBe(false)
    expect(constructor).toHaveBeenCalledTimes(1)
  })

  it('should validate different time zones independently', () => {
    const constructor = spyDateTimeFormat()

    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('Invalid/TimeZone')).toBe(false)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('Invalid/TimeZone')).toBe(false)
    expect(constructor).toHaveBeenCalledTimes(2)
  })

  it('should release cached validations when a new key exceeds the entry limit', () => {
    const constructor = spyDateTimeFormat()

    expect(isValidTimeZone('UTC')).toBe(true)
    for (let index = 0; index < 255; index += 1) {
      expect(isValidTimeZone(`Invalid/Zone${index}`)).toBe(false)
    }
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(constructor).toHaveBeenCalledTimes(256)

    expect(isValidTimeZone('Invalid/NewZone')).toBe(false)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(constructor).toHaveBeenCalledTimes(258)
  })
})
