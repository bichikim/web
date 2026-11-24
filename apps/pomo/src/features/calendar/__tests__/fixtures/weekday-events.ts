import type {CalendarEvent} from '../../types'

interface CreateEventsOptions {
  /** Include the previous week's events; omitted returns only the next week's three events. */
  readonly includePreviousWeek?: boolean
}

const createPreviousEvents = (): readonly CalendarEvent[] => [
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-08-31T04:00:00.000Z',
    id: 'oldmonday',
    provider: 'google',
    start: '2026-08-31T03:00:00.000Z',
    title: '이번 주 제외할 월요일',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-01T01:00:00.000Z',
    id: 'oldTuesdayAM',
    provider: 'google',
    start: '2026-09-01T00:00:00.000Z',
    title: '이번 주 화요일 오전',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-01T07:00:00.000Z',
    id: 'oldTuesdayPM',
    provider: 'google',
    start: '2026-09-01T06:00:00.000Z',
    title: '이번 주 화요일 오후',
  },
]

export const createEvents = (options: CreateEventsOptions = {}): readonly CalendarEvent[] => [
  ...(options.includePreviousWeek ? createPreviousEvents() : []),
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-07T04:00:00.000Z',
    id: 'monday',
    provider: 'google',
    start: '2026-09-07T03:00:00.000Z',
    title: '제외할 월요일 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-08T01:00:00.000Z',
    id: 'tuesday-am',
    provider: 'google',
    start: '2026-09-08T00:00:00.000Z',
    title: '화요일 오전 일정',
  },
  {
    accountLabel: 'fixture@example.com',
    allDay: false,
    calendarLabel: 'Fixture',
    end: '2026-09-08T07:00:00.000Z',
    id: 'tuesday-pm',
    provider: 'google',
    start: '2026-09-08T06:00:00.000Z',
    title: '화요일 오후 일정',
  },
]
