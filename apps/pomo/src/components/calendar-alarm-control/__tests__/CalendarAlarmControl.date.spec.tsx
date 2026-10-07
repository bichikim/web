/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {localDateRuntime} from '../../../features/civil-date'
import {event, mocks, setupCalendarAlarmControl} from './fixtures/setup'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

setupCalendarAlarmControl()

beforeEach(() => {
  vi.stubEnv('TZ', 'UTC')
  vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const openAlarm = (container: HTMLElement) => {
  fireEvent.click(container.querySelector('button')!)
  return container.querySelector('input[type="date"]') as HTMLInputElement
}

it.each([
  {
    date: new Date('2026-01-31T14:59:59.000Z'),
    minimumDate: '2026-01-31',
    nextMinimumDate: '2026-02-01',
  },
  {
    date: new Date('2026-12-31T14:59:59.000Z'),
    minimumDate: '2026-12-31',
    nextMinimumDate: '2027-01-01',
  },
])(
  'should advance the alarm date minimum at Asia/Seoul midnight from $minimumDate',
  async ({date, minimumDate, nextMinimumDate}) => {
    vi.setSystemTime(date)
    const view = render(() => (
      <CalendarAlarmControl event={event} memos={() => mocks.memos} timeZone="Asia/Seoul" />
    ))
    const dateInput = openAlarm(view.container)
    expect(dateInput.min).toBe(minimumDate)
    await vi.advanceTimersByTimeAsync(999)
    expect(dateInput.min).toBe(minimumDate)
    await vi.advanceTimersByTimeAsync(1)
    expect(dateInput.min).toBe(nextMinimumDate)
    expect(new Date().getDate()).toBe(31)
  },
)

it('should refresh on visible return after the calendar date changes', () => {
  vi.setSystemTime(new Date('2026-01-31T14:30:00.000Z'))
  const documentHidden = vi.spyOn(document, 'hidden', 'get')
  const view = render(() => (
    <CalendarAlarmControl event={event} memos={() => mocks.memos} timeZone="Asia/Seoul" />
  ))
  const dateInput = openAlarm(view.container)
  expect(dateInput.min).toBe('2026-01-31')

  documentHidden.mockReturnValue(true)
  vi.setSystemTime(new Date('2026-01-31T15:15:00.000Z'))
  fireEvent(document, new Event('visibilitychange'))
  expect(dateInput.min).toBe('2026-01-31')

  documentHidden.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  expect(dateInput.min).toBe('2026-02-01')
})

it('should follow the calendar time zone when it changes while the alarm is open', () => {
  vi.setSystemTime(new Date('2026-01-31T16:00:00.000Z'))
  const [timeZone, setTimeZone] = createSignal('Asia/Seoul')
  const view = render(() => (
    <CalendarAlarmControl event={event} memos={() => mocks.memos} timeZone={timeZone()} />
  ))
  const dateInput = openAlarm(view.container)
  expect(dateInput.min).toBe('2026-02-01')

  setTimeZone('America/Los_Angeles')

  expect(dateInput.min).toBe('2026-01-31')
})

it('should schedule the next calendar midnight across the spring DST change', async () => {
  vi.setSystemTime(new Date('2026-03-08T04:59:59.000Z'))
  const view = render(() => (
    <CalendarAlarmControl event={event} memos={() => mocks.memos} timeZone="America/New_York" />
  ))
  const dateInput = openAlarm(view.container)
  expect(dateInput.min).toBe('2026-03-07')

  await vi.advanceTimersByTimeAsync(1000)
  expect(dateInput.min).toBe('2026-03-08')
  await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000)
  expect(dateInput.min).toBe('2026-03-09')
})

it('should cancel the midnight timer and visibility subscription on close and unmount', async () => {
  vi.setSystemTime(new Date('2026-01-31T14:59:59.000Z'))
  const schedule = localDateRuntime.schedule
  const subscribe = localDateRuntime.subscribe
  const scheduleSpy = vi
    .spyOn(localDateRuntime, 'schedule')
    .mockImplementation((callback, delay) => vi.fn(schedule(callback, delay)))
  const subscribeSpy = vi
    .spyOn(localDateRuntime, 'subscribe')
    .mockImplementation((callback) => vi.fn(subscribe(callback)))
  const dispatchToggle = (popover: Element, newState: 'open' | 'closed') => {
    const toggle = new Event('toggle')
    Object.defineProperty(toggle, 'newState', {value: newState})
    popover.dispatchEvent(toggle)
  }

  const view = render(() => (
    <CalendarAlarmControl event={event} memos={() => mocks.memos} timeZone="Asia/Seoul" />
  ))
  expect(openAlarm(view.container).min).toBe('2026-01-31')
  expect(scheduleSpy).toHaveBeenCalledOnce()
  expect(subscribeSpy).toHaveBeenCalledOnce()
  const cancelClosedTimer = scheduleSpy.mock.results[0]?.value as () => void
  const unsubscribeClosed = subscribeSpy.mock.results[0]?.value as () => void

  dispatchToggle(view.container.querySelector('[popover]')!, 'closed')
  expect(view.container.querySelector('input[type="date"]')).toBeNull()
  expect(cancelClosedTimer).toHaveBeenCalledOnce()
  expect(unsubscribeClosed).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000)
  expect(scheduleSpy).toHaveBeenCalledOnce()

  vi.setSystemTime(new Date('2026-02-01T15:00:00.000Z'))
  expect(openAlarm(view.container).min).toBe('2026-02-02')
  expect(scheduleSpy).toHaveBeenCalledTimes(2)
  expect(subscribeSpy).toHaveBeenCalledTimes(2)
  const cancelUnmountedTimer = scheduleSpy.mock.results[1]?.value as () => void
  const unsubscribeUnmounted = subscribeSpy.mock.results[1]?.value as () => void

  view.unmount()
  expect(cancelUnmountedTimer).toHaveBeenCalledOnce()
  expect(unsubscribeUnmounted).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000)
  expect(scheduleSpy).toHaveBeenCalledTimes(2)
})
