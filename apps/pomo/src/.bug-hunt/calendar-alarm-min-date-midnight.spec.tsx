/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {CalendarEvent} from '../features/calendar'
import {CalendarAlarmControl} from '../components/calendar-alarm-control/CalendarAlarmControl'

vi.mock('../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: vi.fn(),
  usePEvents: () => ({deleteDialogue: vi.fn()}),
}))
vi.mock('../features/memory-assist/repository', async () => {
  const actual = await vi.importActual('../features/memory-assist/repository')
  return {
    ...actual,
    readMemoryMemos: async () => [],
    updateMemoryMemos: vi.fn(),
  }
})

const event: CalendarEvent = {
  accountLabel: 'person@example.com',
  allDay: false,
  calendarLabel: '업무',
  end: '2026-02-01T10:00:00.000Z',
  id: 'connection-1:event-1',
  provider: 'google',
  start: '2026-02-01T09:00:00.000Z',
  title: '팀 회의',
}

const matches = HTMLElement.prototype.matches

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 31, 23, 30))
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value(this: HTMLElement, selector: string) {
      return selector === ':popover-open' ? true : matches.call(this, selector)
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value: matches,
  })
})

it('should refresh the alarm date minimum after local midnight while the popover stays open', () => {
  render(() => <CalendarAlarmControl event={event} memos={() => []} timeZone="UTC" />)

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))

  const dateInput = () => screen.getByLabelText('날짜') as HTMLInputElement
  expect(dateInput().min).toBe('2026-01-31')

  vi.setSystemTime(new Date(2026, 1, 1, 0, 15))

  expect(dateInput().min).toBe('2026-02-01')
})
