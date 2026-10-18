import {z} from 'zod'
const DATE_TIME_SCHEMA = z
  .string()
  .trim()
  .pipe(z.iso.datetime({offset: true}))
export interface TimedInterval {
  readonly start: number
  readonly end: number
}
/** Trims surrounding whitespace and returns a strictly increasing ISO interval with explicit timezone offsets. */
export const parseTimedInterval = (start: string, end: string): TimedInterval | null => {
  const startResult = DATE_TIME_SCHEMA.safeParse(start)
  const endResult = DATE_TIME_SCHEMA.safeParse(end)
  if (!startResult.success || !endResult.success) {
    return null
  }
  const interval = {end: Date.parse(endResult.data), start: Date.parse(startResult.data)}
  return interval.end > interval.start ? interval : null
}
