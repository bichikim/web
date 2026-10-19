import type {Accessor} from 'solid-js'

export type {PaginationOptions} from 'src/utils/with-pagination'
import type {PaginationOptions} from 'src/utils/with-pagination'

export interface UsePaginatedListProps<Page, Item, Key, PageParam> extends PaginationOptions<
  Page,
  PageParam
> {
  readonly getItems: (page: Page) => ReadonlyArray<Item>
  readonly getKey: (item: Item) => Key
}

export interface ReplacePageOptions<Item> {
  readonly retainItems?: boolean
  readonly reconcileItems?: (
    current: ReadonlyArray<Item>,
    incoming: ReadonlyArray<Item>,
  ) => ReadonlyArray<Item>
}

export interface PaginatedList<Page, Item, Key, PageParam> {
  readonly items: Accessor<ReadonlyArray<Item>>
  readonly pages: Accessor<ReadonlyArray<Page>>
  readonly pageParams: Accessor<ReadonlyArray<PageParam>>
  readonly nextPageParam: Accessor<PageParam | null | undefined>
  readonly appendPage: (page: Page, pageParam: PageParam) => void
  readonly replacePage: (
    page: Page,
    pageParam: PageParam,
    options?: ReplacePageOptions<Item>,
  ) => void
  readonly reset: () => void
  readonly updateItem: (key: Key, update: (item: Item) => Item) => void
}
