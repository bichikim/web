import type {Accessor} from 'solid-js'
import type {PaginatedPageQuery} from 'src/utils/with-pagination'
import type {PaginatedList, ReplacePageOptions} from '../use-paginated-list'

export interface UsePaginatedQueryProps<Args extends unknown[], Page, Item, Key, PageParam> {
  readonly args: Accessor<[...Args]>
  readonly query: PaginatedPageQuery<Args, Page, PageParam>
  readonly getItems: (page: Page) => ReadonlyArray<Item>
  readonly getKey: (item: Item) => Key
}

export interface RefreshPageOptions<Item> extends ReplacePageOptions<Item> {
  readonly invalidate?: boolean
}

export interface LoadedPage<Page> {
  readonly status: 'loaded'
  readonly page: Page
}
export interface FailedPage {
  readonly status: 'failed'
}
export interface CancelledPage {
  readonly status: 'cancelled'
}
export interface SkippedPage {
  readonly status: 'skipped'
}
export type PageLoadResult<Page> = LoadedPage<Page> | FailedPage | CancelledPage | SkippedPage

export interface PaginatedQuery<Page, Item, Key, PageParam> extends PaginatedList<
  Page,
  Item,
  Key,
  PageParam
> {
  readonly isLoading: Accessor<boolean>
  readonly isLoadingMore: Accessor<boolean>
  readonly loadFailed: Accessor<boolean>
  readonly loadMoreFailed: Accessor<boolean>
  readonly refresh: (options?: RefreshPageOptions<Item>) => Promise<PageLoadResult<Page>>
  readonly loadMore: () => Promise<PageLoadResult<Page>>
}
