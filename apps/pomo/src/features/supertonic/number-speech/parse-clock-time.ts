const MAX_CLOCK_HOUR = 24
const MINUTES_PER_HOUR = 60

interface ParsedClockTime {
  readonly hour: number
  readonly minute: number
}

const parseClockComponent = (value: string): number | null => {
  const normalized = value.replace(/[０-９]/gu, (digit) => digit.normalize('NFKC'))

  if (!/^\d{1,2}$/u.test(normalized)) {
    return null
  }

  return Number(normalized)
}

/** Parses clock components, allowing 24:00 as the end of a day. */
export const parseClockTime = (hourValue: string, minuteValue: string): ParsedClockTime | null => {
  const hour = parseClockComponent(hourValue)
  const minute = parseClockComponent(minuteValue)

  return hour === null ||
    minute === null ||
    hour > MAX_CLOCK_HOUR ||
    minute >= MINUTES_PER_HOUR ||
    (hour === MAX_CLOCK_HOUR && minute !== 0)
    ? null
    : {hour, minute}
}
