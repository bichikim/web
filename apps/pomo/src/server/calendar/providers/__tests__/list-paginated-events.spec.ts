/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import {listPaginatedEvents} from '../list-paginated-events'
import {PAGINATION_LIMITS} from '../paginate'
import type {ProviderEvent} from '../types'

const event: ProviderEvent = {
  allDay: false,
  calendarLabel: 'Work',
  end: '2026-10-06T11:00:00.000Z',
  id: 'event',
  start: '2026-10-06T10:00:00.000Z',
  title: 'Meeting',
}

describe('listPaginatedEvents', () => {
  it('should retain prior pages when a later page rejects and stop loading', async () => {
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({items: [event], nextCursor: 'next'})
      .mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(listPaginatedEvents<string>(loadPage)).resolves.toEqual({
      events: [event],
      truncated: false,
      unavailableCalendars: 1,
    })
    expect(loadPage.mock.calls).toEqual([[null], ['next']])
  })

  it('should report first-page synchronous failures as unavailable', async () => {
    await expect(
      listPaginatedEvents(() => {
        throw new TypeError('invalid page')
      }),
    ).resolves.toEqual({
      events: [],
      truncated: false,
      unavailableCalendars: 1,
    })
  })

  it('should preserve cursor identity and return complete event pages', async () => {
    const cursor = new URL('https://graph.microsoft.com/v1.0/events?next=1')
    const loadPage = vi
      .fn()
      .mockResolvedValueOnce({items: [event], nextCursor: cursor})
      .mockResolvedValueOnce({items: [{...event, id: 'second'}], nextCursor: null})
    await expect(listPaginatedEvents<URL>(loadPage)).resolves.toEqual({
      events: [event, {...event, id: 'second'}],
      truncated: false,
      unavailableCalendars: 0,
    })
    expect(loadPage.mock.calls[1][0]).toBe(cursor)
  })

  it('should bound requests at the existing event page limit', async () => {
    const loadPage = vi.fn(async () => ({items: [event], nextCursor: 'next'}))
    const result = await listPaginatedEvents<string>(loadPage)
    expect(loadPage).toHaveBeenCalledTimes(PAGINATION_LIMITS.events.maximumPages)
    expect(result).toEqual({
      events: Array.from({length: PAGINATION_LIMITS.events.maximumPages}, () => event),
      truncated: true,
      unavailableCalendars: 0,
    })
  })

  it('should bound normalized events at the existing event item limit', async () => {
    const loadPage = vi.fn(async () => ({
      items: Array.from({length: PAGINATION_LIMITS.events.maximumItems + 1}, () => event),
      nextCursor: null,
    }))
    const result = await listPaginatedEvents(loadPage)
    expect(result.events).toHaveLength(PAGINATION_LIMITS.events.maximumItems)
    expect(result.truncated).toBe(true)
    expect(result.unavailableCalendars).toBe(0)
    expect(loadPage).toHaveBeenCalledOnce()
  })
})
