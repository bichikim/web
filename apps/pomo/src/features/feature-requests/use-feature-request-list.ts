import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'
import {
  type PageLoadResult,
  type PaginatedQuery,
  usePaginatedQuery,
} from 'src/hooks/use-paginated-query'

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
  readonly invalidatePagination: () => void
  readonly updateRequest: (
    requestId: string,
    update: (request: FeatureRequest) => FeatureRequest,
  ) => void
}

export type FeatureRequestListView = Pick<
  FeatureRequestListController,
  | 'hasMore'
  | 'isLoading'
  | 'isLoadingMore'
  | 'loadFailed'
  | 'loadMore'
  | 'loadMoreFailed'
  | 'refresh'
  | 'requests'
>

interface UseRequestPaginationProps {
  /** Whether the owning list currently permits another page request. */
  readonly canLoadMore: Accessor<boolean>
  /** The owning list generation; changed by refresh, scope changes and disposal. */
  readonly generation: Accessor<number>
  /** The query controller owned and disposed by the list. */
  readonly list: PaginatedQuery<FeatureRequestPage, FeatureRequest, string, number>
  /** Records a completed page and its pagination state for the owning list. */
  readonly onLoaded: (page: FeatureRequestPage) => void
}

const useRequestPagination = (props: UseRequestPaginationProps) => {
  const [isReconciling, setIsReconciling] = createSignal(false)
  const [reconcileFailed, setReconcileFailed] = createSignal(false)
  let paginationRevision = 0
  let reconciledRevision = 0
  const reconcilePagination = async (): Promise<void> => {
    const generation = props.generation()
    const revision = paginationRevision
    const itemCount = props.list.items().length
    setIsReconciling(true)
    setReconcileFailed(false)
    try {
      const scan = async (result: PageLoadResult<FeatureRequestPage>): Promise<void> => {
        if (generation !== props.generation()) {
          return
        }
        if (result.status !== 'loaded') {
          setReconcileFailed(result.status === 'failed')
          return
        }
        if (!result.page.hasMore || props.list.items().length > itemCount) {
          reconciledRevision = revision
          props.onLoaded({
            ...result.page,
            hasMore: result.page.hasMore || revision !== paginationRevision,
          })
          return
        }
        return scan(await props.list.loadMore())
      }
      return await scan(
        await props.list.refresh({
          reconcileItems: (current, incoming) => [...current, ...incoming],
        }),
      )
    } finally {
      if (generation === props.generation()) {
        setIsReconciling(false)
      }
    }
  }

  const loadMore = async (): Promise<void> => {
    if (!props.canLoadMore() || isReconciling() || props.list.isLoadingMore()) {
      return
    }
    if (paginationRevision !== reconciledRevision) {
      return reconcilePagination()
    }
    const generation = props.generation()
    const revision = paginationRevision
    const result = await props.list.loadMore()
    if (generation !== props.generation()) {
      return
    }
    if (result.status === 'loaded') {
      props.onLoaded({
        ...result.page,
        hasMore: result.page.hasMore || revision !== paginationRevision,
      })
    }
  }

  const resetReconciliation = () => {
    setIsReconciling(false)
    setReconcileFailed(false)
  }
  const reset = () => {
    paginationRevision = 0
    reconciledRevision = 0
    resetReconciliation()
  }
  return {
    invalidatePagination: () => {
      paginationRevision += 1
    },
    isReconciling,
    loadMore,
    reconcileFailed,
    reset,
    resetReconciliation,
  }
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

  const pagination = useRequestPagination({
    canLoadMore: () => hasMore() && !isRefreshing(),
    generation: () => listGeneration,
    list,
    onLoaded: (page) => {
      setHasMore(page.hasMore)
      loadedPagesState = 'loaded'
    },
  })

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
    pagination.resetReconciliation()
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

  createEffect(
    on(props.scope, () => {
      listGeneration += 1
      loadedPagesState = 'none'
      refreshFallbackHasMore = undefined
      refreshingItemCount = undefined
      pagination.reset()
      setHasMore(false)
      loadFirstPage({invalidate: false})
      onCleanup(() => {
        listGeneration += 1
        pagination.resetReconciliation()
      })
    }),
  )
  const refresh = () => loadFirstPage()
  return {
    hasMore,
    invalidatePagination: () => {
      pagination.invalidatePagination()
      setHasMore(true)
    },
    isLoading: () => (list.isLoading() && !pagination.isReconciling()) || isRefreshing(),
    isLoadingMore: () => list.isLoadingMore() || pagination.isReconciling(),
    loadFailed: () => list.loadFailed() && !pagination.reconcileFailed(),
    loadMore: pagination.loadMore,
    loadMoreFailed: () => list.loadMoreFailed() || pagination.reconcileFailed(),
    refresh,
    refreshAfterMutation: () => loadFirstPage({preserveLoadedPages: loadedPagesState !== 'none'}),
    requests: list.items,
    updateRequest: list.updateItem,
  }
}
