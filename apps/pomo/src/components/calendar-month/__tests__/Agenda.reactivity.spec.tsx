/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {CalendarEvent} from '../../../features/calendar'
import {CalendarAgenda} from '../Agenda'

vi.mock('../../../features/focus-room-dialogue', () => ({usePEvents: vi.fn()}))

const matches = HTMLElement.prototype.matches
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {configurable: true, value: vi.fn()})
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value(this: HTMLElement, selector: string) {
      return selector === ':popover-open' ? false : matches.call(this, selector)
    },
  })
})
afterEach(() => {
  cleanup()
  Object.defineProperty(HTMLElement.prototype, 'matches', {configurable: true, value: matches})
  vi.restoreAllMocks()
})

it('should preserve the alarm draft and focus when the same calendar event is refreshed', () => {
  const event: CalendarEvent = {
    accountLabel: 'person@example.com',
    allDay: true,
    calendarLabel: '업무',
    end: '2026-10-03',
    id: 'connection:event',
    provider: 'google',
    start: '2026-10-02',
    title: '팀 회의',
  }
  const [events, setEvents] = createSignal<ReadonlyArray<CalendarEvent>>([event])
  render(() => (
    <CalendarAgenda
      calendar={{
        connectedConnections: 1,
        events: events(),
        timeZone: 'Asia/Seoul',
        truncated: false,
        unavailableConnections: 0,
      }}
      failed={false}
      loading={false}
      loginRequired={false}
      memos={() => []}
      refreshFailed={false}
      selectedDate={new Date(2026, 9, 2)}
      selectedEvents={events()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  const time = screen.getByLabelText('시간')
  const dialog = screen.getByRole('dialog', {name: '일정 알람'})
  fireEvent.input(time, {target: {value: '12:30'}})
  time.focus()
  expect(time).toHaveValue('12:30')
  expect(document.activeElement).toBe(time)
  setEvents([{...event, title: '팀 회의 갱신'}])
  expect(screen.getByRole('button', {name: '팀 회의 갱신 알람 설정'})).toBeInTheDocument()
  const nextTime = screen.getByLabelText('시간')
  expect(time.isConnected).toBe(true)
  expect(dialog.isConnected).toBe(true)
  expect(nextTime).toBe(time)
  expect(nextTime).toHaveValue('12:30')
  expect(document.activeElement).toBe(nextTime)
})
