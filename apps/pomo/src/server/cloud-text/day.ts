const MILLISECONDS_PER_HOUR = 3_600_000
const KOREA_OFFSET_HOURS = 9
const DATE_LENGTH = 10
const MILLISECONDS_PER_DAY = 86_400_000

/** Returns the Korea calendar day and its next midnight in UTC. */
export const getCloudTextDay = (now: Date) => {
  const offset = KOREA_OFFSET_HOURS * MILLISECONDS_PER_HOUR
  const day = new Date(now.getTime() + offset).toISOString().slice(0, DATE_LENGTH)
  const midnight = new Date(`${day}T00:00:00.000Z`).getTime()
  return {day, resetsAt: new Date(midnight + MILLISECONDS_PER_DAY - offset).toISOString()}
}
