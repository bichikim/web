const KOREA_OFFSET_HOURS = 9
const MINUTES_PER_HOUR = 60
const MILLISECONDS_PER_MINUTE = 60_000
const KOREA_OFFSET_MS = KOREA_OFFSET_HOURS * MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE
const OBSERVATION_AVAILABLE_MINUTE = 10
const SKY_AVAILABLE_MINUTE = 45
const YEAR_END_INDEX = 4
const MONTH_END_INDEX = 6
const DAY_END_INDEX = 8
const HOUR_END_INDEX = 2
const MINUTE_END_INDEX = 4
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1_000

export interface KmaBaseTime {
  readonly date: string
  readonly time: string
}

const pad = (value: number): string => value.toString().padStart(2, '0')

const toKoreaClock = (date: Date): Date => new Date(date.getTime() + KOREA_OFFSET_MS)

const createBaseTime = (date: Date, minute: string): KmaBaseTime => {
  const koreaClock = toKoreaClock(date)

  return {
    date: `${koreaClock.getUTCFullYear()}${pad(koreaClock.getUTCMonth() + 1)}${pad(koreaClock.getUTCDate())}`,
    time: `${pad(koreaClock.getUTCHours())}${minute}`,
  }
}

const getLatestAvailableHour = (now: Date, availableMinute: number): Date =>
  now.getUTCMinutes() >= availableMinute
    ? now
    : new Date(now.getTime() - MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE)

/** Resolves the latest KMA observation time available for querying. */
export const getKmaObservationTime = (now: Date): KmaBaseTime =>
  createBaseTime(getLatestAvailableHour(now, OBSERVATION_AVAILABLE_MINUTE), '00')

/** Resolves the latest KMA issue time used only to supplement the current sky state. */
export const getKmaSkyTime = (now: Date): KmaBaseTime =>
  createBaseTime(getLatestAvailableHour(now, SKY_AVAILABLE_MINUTE), '30')

/** Resolves the latest boundary at which either current weather input became available. */
export const getLatestKmaAvailabilityTime = (now: Date): Date => {
  const boundary = new Date(now)
  const minute = now.getUTCMinutes()

  if (minute < OBSERVATION_AVAILABLE_MINUTE) {
    boundary.setUTCHours(boundary.getUTCHours() - 1, SKY_AVAILABLE_MINUTE, 0, 0)
  } else if (minute < SKY_AVAILABLE_MINUTE) {
    boundary.setUTCMinutes(OBSERVATION_AVAILABLE_MINUTE, 0, 0)
  } else {
    boundary.setUTCMinutes(SKY_AVAILABLE_MINUTE, 0, 0)
  }

  return boundary
}

/** Returns a cache lifetime ending at the next documented KMA availability boundary. */
export const getSecondsUntilNextKmaAvailability = (now: Date): number => {
  const minute = now.getUTCMinutes()
  const nextMinute =
    minute < OBSERVATION_AVAILABLE_MINUTE
      ? OBSERVATION_AVAILABLE_MINUTE
      : minute < SKY_AVAILABLE_MINUTE
        ? SKY_AVAILABLE_MINUTE
        : MINUTES_PER_HOUR + OBSERVATION_AVAILABLE_MINUTE
  const elapsedSeconds = minute * SECONDS_PER_MINUTE + now.getUTCSeconds()
  const boundarySeconds = nextMinute * SECONDS_PER_MINUTE
  const remainingMilliseconds =
    (boundarySeconds - elapsedSeconds) * MILLISECONDS_PER_SECOND - now.getUTCMilliseconds()

  return Math.max(1, Math.ceil(remainingMilliseconds / MILLISECONDS_PER_SECOND))
}

/** Converts a KMA Korea-local date and time into an absolute instant. */
export const parseKmaDateTime = (date: string, time: string): Date => {
  const year = Number(date.slice(0, YEAR_END_INDEX))
  const month = Number(date.slice(YEAR_END_INDEX, MONTH_END_INDEX))
  const day = Number(date.slice(MONTH_END_INDEX, DAY_END_INDEX))
  const hour = Number(time.slice(0, HOUR_END_INDEX))
  const minute = Number(time.slice(HOUR_END_INDEX, MINUTE_END_INDEX))

  return new Date(Date.UTC(year, month - 1, day, hour - KOREA_OFFSET_HOURS, minute))
}
