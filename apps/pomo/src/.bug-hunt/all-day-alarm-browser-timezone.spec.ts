/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CalendarEvent} from 'src/features/calendar'
import {useCalendarAlarmController} from '../features/calendar-alarm/use-calendar-alarm-controller'

vi.mock('../features/focus-room-dialogue', () => ({
  usePEvents: () => ({
    deleteDialogue: vi.fn(),
  }),
}))

const allDayEvent: CalendarEvent = {
  allDay: true,
  end: '2026-09-06',
  id: 'event-1',
  provider: 'microsoft',
  start: '2026-09-05',
  title: 'Holiday',
}

const expectedSeoulNineAmUtc = '2026-09-05T00:00:00.000Z'

/**
 * All-day alarm default uses local Date(y,m,d,9) instead of 09:00 in display timezone.
 *
 * @see apps/pomo/src/features/calendar-alarm/use-calendar-alarm-controller.ts L19-31
 */
describe('bug-hunt: all-day calendar alarm timezone', () => {
  const previousTimeZone = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'America/New_York'
  })

  afterEach(() => {
    process.env.TZ = previousTimeZone
  })

  it('should default all-day alarm to 09:00 Asia/Seoul, not browser-local 09:00', () => {
    const popover = {
      hidePopover: vi.fn(),
      matches: vi.fn().mockReturnValue(false),
      showPopover: vi.fn(),
    }
    const {result} = renderHook(() =>
      useCalendarAlarmController(
        () => allDayEvent,
        () => [],
        () => undefined,
        () => new Date('2026-09-01T12:00:00.000Z'),
      ),
    )

    result.setPopoverElement(popover as unknown as HTMLElement)
    result.toggle()

    const alarmAt = new Date(`${result.date()}T${result.time()}:00`)

    expect(alarmAt.toISOString()).toBe(expectedSeoulNineAmUtc)
  })
})
