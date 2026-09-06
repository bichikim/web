/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {CalendarAgenda} from '../Agenda'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const base: ComponentProps<typeof CalendarAgenda> = {
  calendar: {
    connectedConnections: 1,
    events: [],
    timeZone: 'Asia/Seoul',
    truncated: false,
    unavailableConnections: 0,
  },
  failed: false,
  loading: false,
  loginRequired: false,
  memos: {} as ComponentProps<typeof CalendarAgenda>['memos'],
  refreshFailed: false,
  selectedDate: new Date(2026, 8, 4),
  selectedEvents: [],
}
it.each([
  [{loginRequired: true}, m.calendar_events_login_required()],
  [{loading: true}, m.calendar_loading()],
  [{failed: true}, m.calendar_events_failed()],
  [{}, m.calendar_day_empty()],
] as const)('should explain the current agenda state %j', (state, message) => {
  render(() => <CalendarAgenda {...base} {...state} />)
  expect(screen.getByText(message)).toBeVisible()
})
