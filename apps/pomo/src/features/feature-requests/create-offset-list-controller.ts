import {createSignal, onMount} from 'solid-js'
import type {FeatureRequest} from './types'
export interface FeatureRequestsRefreshOptions {
  readonly preserveLoadedPages?: boolean
}
type LoadedPagesState = 'loaded' | 'none' | 'refreshed'
export interface OffsetListPage {
  readonly requests: ReadonlyArray<FeatureRequest>
  readonly hasMore: boolean
}
export interface OffsetListControllerOptions {
  readonly loadPage: (options?: {readonly offset?: number}) => Promise<OffsetListPage>
  readonly reconcileRefresh?: (
    current: ReadonlyArray<FeatureRequest>,
    refreshed: ReadonlyArray<FeatureRequest>,
  ) => ReadonlyArray<FeatureRequest>
}
const appendNewRequests = (
  currentRequests: ReadonlyArray<FeatureRequest>,
  nextRequests: ReadonlyArray<FeatureRequest>,
): ReadonlyArray<FeatureRequest> => {
  const currentRequestIds = new Set(currentRequests.map((request) => request.id))

  return [
    ...currentRequests,
    ...nextRequests.filter((request) => !currentRequestIds.has(request.id)),
  ]
}

/** Owns paginated list loading, refresh races and already-loaded page retention. */
export const createOffsetListController = (options: OffsetListControllerOptions) => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  let listGeneration = 0
  let loadedPagesState: LoadedPagesState = 'none'
  let nextOffset = 0
  let refreshFallbackHasMore: boolean | undefined

  const refresh = async (refreshOptions: FeatureRequestsRefreshOptions = {}): Promise<void> => {
    const preserveLoadedPagesExplicitly = refreshOptions.preserveLoadedPages === true
    const preserveLoadedPages = preserveLoadedPagesExplicitly || loadedPagesState !== 'none'
    const previousHasMore = refreshFallbackHasMore ?? hasMore()
    const preservePreviousNoMore =
      loadedPagesState === 'refreshed' || !preserveLoadedPagesExplicitly
    refreshFallbackHasMore = previousHasMore

    listGeneration += 1
    const generation = listGeneration
    setIsLoading(true)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      const page = await options.loadPage()
      if (generation !== listGeneration) {
        return
      }

      refreshFallbackHasMore = undefined
      nextOffset = page.requests.length
      if (preserveLoadedPages) {
        setHasMore(preservePreviousNoMore ? previousHasMore && page.hasMore : page.hasMore)
        setRequests((currentRequests) => {
          const refreshedRequestIds = new Set(page.requests.map((request) => request.id))
          const refreshedRequests = [
            ...page.requests,
            ...currentRequests.filter((request) => !refreshedRequestIds.has(request.id)),
          ]
          return options.reconcileRefresh?.(currentRequests, refreshedRequests) ?? refreshedRequests
        })
        if (!preserveLoadedPagesExplicitly) {
          loadedPagesState = 'refreshed'
        }
      } else {
        setHasMore(page.hasMore)
        setRequests(
          (currentRequests) =>
            options.reconcileRefresh?.(currentRequests, page.requests) ?? page.requests,
        )
      }
    } catch {
      if (generation !== listGeneration) {
        return
      }

      refreshFallbackHasMore = undefined
      setHasMore(previousHasMore)
      setLoadFailed(true)
    } finally {
      if (generation === listGeneration) {
        setIsLoading(false)
      }
    }
  }

  const loadMore = async (): Promise<void> => {
    if (!hasMore() || isLoadingMore()) {
      return
    }

    const offset = nextOffset
    const generation = listGeneration
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    try {
      const page = await options.loadPage({offset})
      if (generation !== listGeneration) {
        return
      }

      nextOffset += page.requests.length
      setRequests((currentRequests) => appendNewRequests(currentRequests, page.requests))
      setHasMore(page.hasMore)
      loadedPagesState = 'loaded'
    } catch {
      if (generation !== listGeneration) {
        return
      }

      setLoadMoreFailed(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const updateRequest = (requestId: string, update: (request: FeatureRequest) => FeatureRequest) =>
    setRequests((current) =>
      current.map((request) => (request.id === requestId ? update(request) : request)),
    )
  onMount(() => {
    refresh().catch(() => undefined)
  })
  return {
    hasMore,
    isLoading,
    isLoadingMore,
    loadFailed,
    loadMore,
    loadMoreFailed,
    refresh,
    refreshAfterMutation: () => refresh({preserveLoadedPages: loadedPagesState !== 'none'}),
    requests,
    updateRequest,
  }
}
