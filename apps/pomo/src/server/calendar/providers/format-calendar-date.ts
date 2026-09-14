import {z} from 'zod'

interface FormatCalendarDateOptions {
  readonly date: Date
  readonly formatter: Pick<Intl.DateTimeFormat, 'formatToParts'>
}

export const formatCalendarDate = ({date, formatter}: FormatCalendarDateOptions): string => {
  const dateParts = Object.fromEntries(
    formatter.formatToParts(date).map(({type, value}) => [type, value]),
  )
  return z.iso.date().parse(`${dateParts.year}-${dateParts.month}-${dateParts.day}`)
}
