import {z} from 'zod'
const DATE_TIME_SCHEMA = z.iso.datetime({offset: true})
export interface TimedInterval {
  readonly start: number
  readonly end: number
}
/** Returns a strictly increasing ISO interval with explicit timezone offsets. */
export const parseTimedInterval = (start: string, end: string): TimedInterval | null => {
  if (!DATE_TIME_SCHEMA.safeParse(start).success || !DATE_TIME_SCHEMA.safeParse(end).success) {
    return null
  }
  const interval = {end: Date.parse(end), start: Date.parse(start)}
  return interval.end > interval.start ? interval : null
}
