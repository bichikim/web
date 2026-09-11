import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'

dayjs.extend(durationPlugin)

const MILLISECONDS_PER_SECOND = 1000

/** Rounds milliseconds to seconds; defaults to total minutes:ss or accepts Day.js duration tokens. */
export const formatDuration = (durationMs: number, format?: string): string => {
  const seconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const duration = dayjs.duration(seconds, 'seconds')
  return duration.format(format ?? `[${Math.floor(duration.asMinutes())}]:ss`)
}
