import {paginate, type PaginatedPage, PAGINATION_LIMITS} from './paginate'
import type {ProviderEvent, ProviderEventsResult} from './types'

/** Retains completed event pages and reports a calendar unavailable when a later page fails. */
export const listPaginatedEvents = async <Cursor>(
  loadPage: (cursor: Cursor | null) => Promise<PaginatedPage<ProviderEvent, Cursor>>,
): Promise<ProviderEventsResult> => {
  let unavailableCalendars = 0
  const result = await paginate<ProviderEvent, Cursor>({
    loadPage: async (cursor) => {
      try {
        return await loadPage(cursor)
      } catch {
        unavailableCalendars = 1
        return {items: [], nextCursor: null}
      }
    },
    maximumItems: PAGINATION_LIMITS.events.maximumItems,
    maximumPages: PAGINATION_LIMITS.events.maximumPages,
  })

  return {
    events: result.items,
    truncated: unavailableCalendars === 0 && result.truncated,
    unavailableCalendars,
  }
}
