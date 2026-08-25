import type {HistoryTargetDate} from './contract'

const KOREAN_TIMEZONE = 'Asia/Seoul'
const MILLISECONDS_PER_DAY = 86_400_000
const YEAR_LENGTH = 4
const KOREAN_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: KOREAN_TIMEZONE,
  year: 'numeric',
})

/** Returns the next Korean calendar date for an upcoming daily publication. */
export const getNextKoreanDate = (now: Date): HistoryTargetDate => {
  const tomorrow = new Date(now.getTime() + MILLISECONDS_PER_DAY)
  const parts = Object.fromEntries(
    KOREAN_DATE_FORMAT.formatToParts(tomorrow).map((part) => [part.type, part.value]),
  )
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)

  return {
    day,
    isoDate: [
      String(year).padStart(YEAR_LENGTH, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-'),
    month,
  }
}
