export const CALENDAR_PROVIDERS = ['google', 'microsoft'] as const

export type CalendarProviderId = (typeof CALENDAR_PROVIDERS)[number]

export const isCalendarProviderId = (value: string): value is CalendarProviderId =>
  value === 'google' || value === 'microsoft'

export interface CalendarEvent {
  readonly accountLabel: string
  readonly allDay: boolean
  readonly calendarLabel: string
  readonly end: string
  readonly id: string
  readonly provider: CalendarProviderId
  readonly start: string
  readonly title: string
}

export interface CalendarEventRange {
  readonly end: string
  readonly start: string
}
