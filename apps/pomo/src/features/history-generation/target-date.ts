import {civilDateFromUtc, formatDate} from '../civil-date'
import type {HistoryTargetDate} from './contract'

/** Returns the next UTC calendar date for an upcoming daily publication. */
export const getNextPublicationDate = (now: Date): HistoryTargetDate => {
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (Number.isNaN(tomorrow.getTime())) {
    throw new TypeError('Failed to calculate the next UTC calendar date')
  }
  const date = civilDateFromUtc(tomorrow)
  return {day: date.day, isoDate: formatDate(date), month: date.month}
}
