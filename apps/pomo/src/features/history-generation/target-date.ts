import {dayjs} from 'src/utils/zoned-dayjs'
import type {HistoryTargetDate} from './contract'

const HOURS_PER_DAY = 24

/** Returns the next UTC calendar date for an upcoming daily publication. */
export const getNextPublicationDate = (now: Date): HistoryTargetDate => {
  const tomorrow = dayjs(now).utc().add(HOURS_PER_DAY, 'hour')
  if (!tomorrow.isValid()) {
    throw new TypeError('Failed to calculate the next UTC calendar date')
  }
  return {day: tomorrow.date(), isoDate: tomorrow.format('YYYY-MM-DD'), month: tomorrow.month() + 1}
}
