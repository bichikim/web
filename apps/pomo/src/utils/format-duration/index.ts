import dayjs from 'dayjs'
import durationPlugin from 'dayjs/plugin/duration'

dayjs.extend(durationPlugin)

const MILLISECONDS_PER_SECOND = 1000

/** 밀리초를 초 단위로 반올림한다. 기본 형식은 총 분:ss이며, Day.js duration 토큰도 받는다. */
export const formatDuration = (durationMs: number, format?: string): string => {
  const seconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const duration = dayjs.duration(seconds, 'seconds')
  return duration.format(format ?? `[${Math.floor(duration.asMinutes())}]:ss`)
}
