import {mapInBatches} from './batch'
import type {ProviderEventsResult} from './types'
const EVENT_REQUEST_CONCURRENCY = 4
export interface AggregateProviderEventsOptions<Calendar> {
  readonly calendars: ReadonlyArray<Calendar>
  readonly truncated: boolean
  readonly load: (calendar: Calendar) => Promise<ProviderEventsResult>
}
/** Loads bounded calendar batches and aggregates availability and pagination results. */
export const aggregateProviderEvents = async <Calendar>(
  options: AggregateProviderEventsOptions<Calendar>,
): Promise<ProviderEventsResult> => {
  const lists = await mapInBatches(options.calendars, EVENT_REQUEST_CONCURRENCY, options.load)
  return {
    events: lists.flatMap((list) => list.events),
    truncated: options.truncated || lists.some((list) => list.truncated),
    unavailableCalendars: lists.reduce((count, list) => count + list.unavailableCalendars, 0),
  }
}
