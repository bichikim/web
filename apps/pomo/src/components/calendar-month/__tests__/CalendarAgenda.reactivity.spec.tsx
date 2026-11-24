/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import type {CalendarEvent} from '../../../features/calendar'
import {CalendarAgenda} from '../CalendarAgenda'

vi.mock('../../../features/focus-room-dialogue', () => ({
  createPDialogueRepository: vi.fn(),
  deleteDialogueAudio: vi.fn(),
  generateCompressedDialogueAudio: vi.fn(),
  usePEvents: vi.fn(),
}))

const matches = HTMLElement.prototype.matches
const originalLocale = getLocale
const showPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const hidePopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  if (showPopover === undefined) {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'matches', {
      configurable: true,
      value(this: HTMLElement, selector: string) {
        return selector === ':popover-open' ? false : matches.call(this, selector)
      },
    })
  }
})
afterEach(() => {
  cleanup()
  overwriteGetLocale(originalLocale)
  Object.defineProperty(HTMLElement.prototype, 'matches', {configurable: true, value: matches})
  if (showPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', showPopover)
  }
  if (hidePopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', hidePopover)
  }
  vi.restoreAllMocks()
})

it.each([true, false])(
  'should preserve the alarm draft and focus after refreshing an all-day=%j event',
  (allDay) => {
    const event: CalendarEvent = {
      accountLabel: 'person@example.com',
      allDay,
      calendarLabel: '업무',
      end: allDay ? '2026-10-03' : '2026-10-02T02:00:00Z',
      id: 'connection:event',
      provider: 'google',
      start: allDay ? '2026-10-02' : '2026-10-02T01:00:00Z',
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
  },
)
