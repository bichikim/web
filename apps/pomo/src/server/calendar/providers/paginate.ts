export const PAGINATION_LIMITS = {
  calendars: {
    maximumItems: 100,
    maximumPages: 20,
    pageSize: 250,
  },
  events: {
    maximumItems: 5000,
    maximumPages: 20,
    pageSize: 250,
  },
} as const

export interface PaginatedPage<Item, Cursor> {
  readonly items: ReadonlyArray<Item>
  readonly nextCursor: Cursor | null
}

export interface PaginateOptions<Item, Cursor> {
  readonly loadPage: (cursor: Cursor | null) => Promise<PaginatedPage<Item, Cursor>>
  readonly maximumItems: number
  readonly maximumPages: number
}

export interface PaginatedResult<Item> {
  readonly items: ReadonlyArray<Item>
  readonly truncated: boolean
}

export const paginate = async <Item, Cursor>({
  loadPage,
  maximumItems,
  maximumPages,
}: PaginateOptions<Item, Cursor>): Promise<PaginatedResult<Item>> => {
  if (maximumItems <= 0 || maximumPages <= 0) {
    return {items: [], truncated: false}
  }

  const loadPages = async (
    cursor: Cursor | null,
    pageCount: number,
    items: Array<Item>,
    truncated: boolean,
  ): Promise<PaginatedResult<Item>> => {
    const page = await loadPage(cursor)
    const remainingItems = maximumItems - items.length
    const pageTruncated = truncated || page.items.length > remainingItems
    items.push(...page.items.slice(0, remainingItems))
    const nextPageCount = pageCount + 1
    const {nextCursor} = page

    if (nextCursor === null) {
      return {items, truncated: pageTruncated}
    }

    if (nextPageCount >= maximumPages || items.length >= maximumItems) {
      return {items, truncated: true}
    }

    return loadPages(nextCursor, nextPageCount, items, pageTruncated)
  }

  return loadPages(null, 0, [], false)
}
