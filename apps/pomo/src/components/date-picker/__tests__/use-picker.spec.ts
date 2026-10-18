/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {usePicker} from '../use-picker'
import {formatDate, parseDate} from 'src/features/civil-date'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
it('should open an empty picker on the UTC date across a host-local date boundary', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T05:00:00.000Z'))
  const picker = renderHook(() => usePicker({}))
  picker.result.toggle()
  expect(picker.result.view()).toEqual({day: 1, month: 1, year: 2026})
  picker.cleanup()
})

it.each([
  {expected: '2024-02-28', key: 'ArrowLeft'},
  {expected: '2024-03-01', key: 'ArrowRight'},
  {expected: '2024-02-22', key: 'ArrowUp'},
  {expected: '2024-03-07', key: 'ArrowDown'},
  {expected: '2024-02-25', key: 'Home'},
  {expected: '2024-03-02', key: 'End'},
  {expected: '2024-01-29', key: 'PageUp'},
  {expected: '2024-03-29', key: 'PageDown'},
])('should move the calendar with $key without selecting a date', ({expected, key}) => {
  const onChange = vi.fn()
  const picker = renderHook(() => usePicker({onChange, value: '2024-02-29'}))
  picker.result.toggle()
  const event = new KeyboardEvent('keydown', {cancelable: true, key})

  picker.result.onKeyDown(event, parseDate('2024-02-29')!)

  expect(formatDate(picker.result.view())).toBe(expected)
  expect(picker.result.value()).toBe('2024-02-29')
  expect(event.defaultPrevented).toBe(true)
  expect(onChange).not.toHaveBeenCalled()
  picker.cleanup()
})

it.each([
  {expected: '2024-02-28', key: 'ArrowLeft', value: '2024-02-28'},
  {expected: '2024-03-01', key: 'ArrowDown', value: '2024-03-01'},
])('should keep $key within the configured dates', ({expected, key, value}) => {
  const picker = renderHook(() => usePicker({max: '2024-03-01', min: '2024-02-28', value}))
  picker.result.toggle()
  const event = new KeyboardEvent('keydown', {cancelable: true, key})

  picker.result.onKeyDown(event, parseDate(value)!)

  expect(formatDate(picker.result.view())).toBe(expected)
  expect(event.defaultPrevented).toBe(true)
  picker.cleanup()
})

it.each(['Enter', 'arrowright'])(
  'should leave the calendar and default action intact for %s',
  (key) => {
    const picker = renderHook(() => usePicker({value: '2024-02-29'}))
    picker.result.toggle()
    const current = picker.result.view()
    const event = new KeyboardEvent('keydown', {cancelable: true, key})

    picker.result.onKeyDown(event, current)

    expect(picker.result.view()).toBe(current)
    expect(event.defaultPrevented).toBe(false)
    picker.cleanup()
  },
)

it('should read the key once after the weekday fields', () => {
  const calls: string[] = []
  const picker = renderHook(() => usePicker({}))
  const event = new KeyboardEvent('keydown')
  Object.defineProperty(event, 'key', {
    get: () => {
      calls.push('key')
      return 'Enter'
    },
  })

  picker.result.onKeyDown(event, {
    get day() {
      calls.push('day')
      return 29
    },
    get month() {
      calls.push('month')
      return 2
    },
    get year() {
      calls.push('year')
      return 2024
    },
  })

  expect(calls).toEqual(['year', 'month', 'day', 'key'])
  picker.cleanup()
})

it('should propagate a key getter failure before moving the calendar', () => {
  const error = new Error('key unavailable')
  const picker = renderHook(() => usePicker({}))
  const current = picker.result.view()
  const event = new KeyboardEvent('keydown', {cancelable: true})
  Object.defineProperty(event, 'key', {
    get: () => {
      throw error
    },
  })

  expect(() => picker.result.onKeyDown(event, current)).toThrow(error)
  expect(picker.result.view()).toBe(current)
  expect(event.defaultPrevented).toBe(false)
  picker.cleanup()
})
