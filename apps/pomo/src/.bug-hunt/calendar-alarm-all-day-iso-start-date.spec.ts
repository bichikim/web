/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {CalendarEvent} from '../features/calendar'
import {useCalendarAlarmController} from '../features/calendar-alarm/use-calendar-alarm-controller'

vi.mock('../features/focus-room-dialogue', () => ({
  usePEvents: () => ({deleteDialogue: vi.fn()}),
}))

vi.mock('../features/memory-assist', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/memory-assist')>()
  return {
    ...actual,
    memoryMemoDeletion: {
      cleanup: vi.fn(),
      delete: vi.fn(),
    },
    updateMemoryMemos: vi.fn(),
  }
})

const allDayEvent: CalendarEvent = {
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-10-01',
  id: 'connection-1:event-iso-start',
  provider: 'google',
  start: '2026-09-30T00:00:00Z',
  title: '종일 일정',
}

it('should default the alarm date to the all-day event calendar date, not the previous local day', () => {
  const [event] = createSignal(allDayEvent)
  const {result} = renderHook(() =>
    useCalendarAlarmController({
      clock: () => new Date('2026-09-29T12:00:00Z'),
      defaultAlarmDate: () => undefined,
      event,
      memos: () => [],
      timeZone: () => 'America/Los_Angeles',
    }),
  )

  const popover = document.createElement('section')
  popover.id = result.popoverId
  Object.defineProperty(popover, 'matches', {
    configurable: true,
    value: (selector: string) => selector === ':popover-open' && false,
  })
  popover.showPopover = vi.fn()
  result.setPopoverElement(popover)

  result.toggle()

  expect(result.date()).toBe('2026-09-30')
})
