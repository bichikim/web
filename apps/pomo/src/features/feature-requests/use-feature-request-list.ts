import {revalidate} from '@solidjs/router'
import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'
import {useOffsetList} from 'src/hooks/use-offset-list'

import type {FeatureRequest, FeatureRequestPageQuery} from './types'

export interface FeatureRequestsRefreshOptions {
  readonly preserveLoadedPages?: boolean
  readonly invalidate?: boolean
}
type LoadedPagesState = 'loaded' | 'none' | 'refreshed'
export interface UseFeatureRequestListProps {
  readonly pageQuery: FeatureRequestPageQuery
  readonly scope: Accessor<string>
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
  const list = useOffsetList({getKey: (request: FeatureRequest) => request.id})
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  let listGeneration = 0
  let loadedPagesState: LoadedPagesState = 'none'
  let refreshFallbackHasMore: boolean | undefined

  const loadFirstPage = async (
    refreshOptions: FeatureRequestsRefreshOptions = {},
  ): Promise<void> => {
    const scope = props.scope()
    const preserveLoadedPagesExplicitly = refreshOptions.preserveLoadedPages === true
    const preserveLoadedPages = preserveLoadedPagesExplicitly || loadedPagesState !== 'none'
    const previousHasMore = refreshFallbackHasMore ?? hasMore()
    const preservePreviousNoMore =
      loadedPagesState === 'refreshed' || !preserveLoadedPagesExplicitly
    refreshFallbackHasMore = previousHasMore

    listGeneration += 1
    const generation = listGeneration
    setIsLoading(true)
    setIsLoadingMore(false)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      if (refreshOptions.invalidate !== false) {
        await revalidate(props.pageQuery.key)
      }
      const page = await props.pageQuery(scope, 0)
      if (generation !== listGeneration) {
        return
      }

      refreshFallbackHasMore = undefined
      if (preserveLoadedPages) {
        setHasMore(preservePreviousNoMore ? previousHasMore && page.hasMore : page.hasMore)
        if (!preserveLoadedPagesExplicitly) {
          loadedPagesState = 'refreshed'
        }
      } else {
        setHasMore(page.hasMore)
      }
      const refreshed = props.reconcileRefresh?.(list.items(), page.requests) ?? page.requests
      list.replacePage(refreshed, {retainItems: preserveLoadedPages})
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

    const offset = list.nextOffset()
    const scope = props.scope()
    const retry = loadMoreFailed()
    const generation = listGeneration
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    try {
      if (retry) {
        await revalidate(props.pageQuery.keyFor(scope, offset))
      }
      const page = await props.pageQuery(scope, offset)
      if (generation !== listGeneration) {
        return
      }

      list.appendPage(page.requests)
      setHasMore(page.hasMore)
      loadedPagesState = 'loaded'
    } catch {
      if (generation !== listGeneration) {
        return
      }

      setLoadMoreFailed(true)
    } finally {
      if (generation === listGeneration) {
        setIsLoadingMore(false)
      }
    }
  }

  createEffect(
    on(props.scope, () => {
      listGeneration += 1
      loadedPagesState = 'none'
      refreshFallbackHasMore = undefined
      list.reset()
      setHasMore(false)
      setIsLoadingMore(false)
      loadFirstPage({invalidate: false})
      onCleanup(() => {
        listGeneration += 1
      })
    }),
  )
  const refresh = () => loadFirstPage()
  return {
    hasMore,
    isLoading,
    isLoadingMore,
    loadFailed,
    loadMore,
    loadMoreFailed,
    refresh,
    refreshAfterMutation: () => loadFirstPage({preserveLoadedPages: loadedPagesState !== 'none'}),
    requests: list.items,
    updateRequest: list.updateItem,
  }
}
