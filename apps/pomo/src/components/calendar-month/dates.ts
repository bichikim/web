import {getLocale} from '@paraglide/runtime'

export interface CalendarDay {
  readonly date: Date
  readonly key: string
  readonly number: number
}

export const WEEK_LENGTH = 7

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(getLocale(), {day: 'numeric', month: 'long', year: 'numeric'}).format(
    date,
  )
