import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'
import {usePaginatedQuery} from 'src/hooks/use-paginated-query'

import type {FeatureRequest, FeatureRequestPage, FeatureRequestPageQuery} from './types'

export interface FeatureRequestsRefreshOptions {
  readonly preserveLoadedPages?: boolean
  readonly invalidate?: boolean
}
type LoadedPagesState = 'loaded' | 'none' | 'refreshed'
export interface UseFeatureRequestListProps {
  readonly pageQuery: FeatureRequestPageQuery
  readonly scope: Accessor<string>
  readonly refreshLoadedPages?: boolean
  readonly reconcileRefresh?: (
    current: ReadonlyArray<FeatureRequest>,
    refreshed: ReadonlyArray<FeatureRequest>,
  ) => ReadonlyArray<FeatureRequest>
}
export interface FeatureRequestListController {
  readonly requests: Accessor<ReadonlyArray<FeatureRequest>>
  readonly hasMore: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly isLoadingMore: Accessor<boolean>
  readonly loadFailed: Accessor<boolean>
  readonly loadMoreFailed: Accessor<boolean>
  readonly refresh: () => Promise<void>
  readonly refreshAfterMutation: () => Promise<void>
  readonly loadMore: () => Promise<void>
  readonly updateRequest: (
    requestId: string,
    update: (request: FeatureRequest) => FeatureRequest,
  ) => void
}

/** Loads request pages and preserves the feature’s first-page refresh policy. */
export const useFeatureRequestList = (
  props: UseFeatureRequestListProps,
): FeatureRequestListController => {
  const list = usePaginatedQuery({
    args: () => [props.scope()],
    getItems: (page: FeatureRequestPage) => page.requests,
    getKey: (request) => request.id,
    query: props.pageQuery,
  })
  const [hasMore, setHasMore] = createSignal(false)
  const [isRefreshing, setIsRefreshing] = createSignal(false)
  let listGeneration = 0
  let loadedPagesState: LoadedPagesState = 'none'
  let refreshFallbackHasMore: boolean | undefined
  let refreshingItemCount: number | undefined

  const reloadNextPages = async (generation: number, itemCount: number): Promise<void> => {
    if (generation !== listGeneration || !hasMore() || list.items().length >= itemCount) {
      return
    }
    const next = await list.loadMore()
    if (generation !== listGeneration || next.status !== 'loaded') {
      return
    }
    setHasMore(next.page.hasMore)
    return reloadNextPages(generation, itemCount)
  }

  const reloadVisiblePages = async (
    refreshOptions: FeatureRequestsRefreshOptions,
  ): Promise<void> => {
    const itemCount = refreshingItemCount ?? list.items().length
    refreshingItemCount = itemCount
    const previousHasMore = refreshFallbackHasMore ?? hasMore()
    refreshFallbackHasMore = previousHasMore
    listGeneration += 1
    const generation = listGeneration
    setIsRefreshing(true)
    setHasMore(false)

    try {
      const result = await list.refresh({
        invalidate: refreshOptions.invalidate,
        reconcileItems: props.reconcileRefresh,
      })
      if (generation !== listGeneration) {
        return
      }
      refreshFallbackHasMore = undefined
      if (result.status !== 'loaded') {
        setHasMore(previousHasMore)
        return
      }
      setHasMore(result.page.hasMore)
      await reloadNextPages(generation, itemCount)
    } finally {
      if (generation === listGeneration) {
        refreshingItemCount = undefined
        setIsRefreshing(false)
      }
    }
  }

  const loadFirstPage = async (
    refreshOptions: FeatureRequestsRefreshOptions = {},
  ): Promise<void> => {
    if (props.refreshLoadedPages === true) {
      return reloadVisiblePages(refreshOptions)
    }
    const preserveLoadedPagesExplicitly = refreshOptions.preserveLoadedPages === true
    const preserveLoadedPages = preserveLoadedPagesExplicitly || loadedPagesState !== 'none'
    const previousHasMore = refreshFallbackHasMore ?? hasMore()
    const preservePreviousNoMore =
      loadedPagesState === 'refreshed' || !preserveLoadedPagesExplicitly
    refreshFallbackHasMore = previousHasMore

    listGeneration += 1
    const generation = listGeneration
    setHasMore(false)

    const result = await list.refresh({
      invalidate: refreshOptions.invalidate,
      reconcileItems: props.reconcileRefresh,
      retainItems: preserveLoadedPages,
    })
    if (generation !== listGeneration) {
      return
    }
    switch (result.status) {
      case 'loaded': {
        refreshFallbackHasMore = undefined
        const retainNoMore = preserveLoadedPages && preservePreviousNoMore
        setHasMore(result.page.hasMore && (!retainNoMore || previousHasMore))
        if (preserveLoadedPages && !preserveLoadedPagesExplicitly) {
          loadedPagesState = 'refreshed'
        }
        break
      }
      case 'failed': {
        refreshFallbackHasMore = undefined
        setHasMore(previousHasMore)
        break
      }
      case 'cancelled':
      case 'skipped': {
        break
      }
      default: {
        const unexpected: never = result
        return unexpected
      }
    }
  }

  const loadMore = async (): Promise<void> => {
    if (!hasMore() || isRefreshing() || list.isLoadingMore()) {
      return
    }
    const generation = listGeneration
    const result = await list.loadMore()
    if (generation !== listGeneration) {
      return
    }
    if (result.status === 'loaded') {
      setHasMore(result.page.hasMore)
      loadedPagesState = 'loaded'
    }
  }

  createEffect(
    on(props.scope, () => {
      listGeneration += 1
      loadedPagesState = 'none'
      refreshFallbackHasMore = undefined
      refreshingItemCount = undefined
      setHasMore(false)
      loadFirstPage({invalidate: false})
      onCleanup(() => {
        listGeneration += 1
      })
    }),
  )
  const refresh = () => loadFirstPage()
  return {
    hasMore,
    isLoading: () => list.isLoading() || isRefreshing(),
    isLoadingMore: list.isLoadingMore,
    loadFailed: list.loadFailed,
    loadMore,
    loadMoreFailed: list.loadMoreFailed,
    refresh,
    refreshAfterMutation: () => loadFirstPage({preserveLoadedPages: loadedPagesState !== 'none'}),
    requests: list.items,
    updateRequest: list.updateItem,
  }
}
