import {createSignal, onMount} from 'solid-js'

import {
  listAdminFeatureRequests,
  updateAdminFeatureRequest,
  type UpdateFeatureRequestResult,
} from './api'
import {FEATURE_REQUEST_STATUSES, type FeatureRequest, type FeatureRequestStatus} from './types'

export interface AdminFeatureRequestStatusInput {
  readonly requestId: string
  readonly status: FeatureRequestStatus
  readonly targetVoteCount: number | null
}

export interface AdminFeatureRequestsController {
  readonly hasMore: () => boolean
  readonly isLoading: () => boolean
  readonly isLoadingMore: () => boolean
  readonly loadFailed: () => boolean
  readonly loadMore: () => Promise<void>
  readonly loadMoreFailed: () => boolean
  readonly refresh: () => Promise<void>
  readonly requests: () => ReadonlyArray<FeatureRequest>
  readonly updateRequest: (
    input: AdminFeatureRequestStatusInput,
  ) => Promise<UpdateFeatureRequestResult>
  readonly updatingRequestId: () => string | null
}

export const useAdminFeatureRequests = (): AdminFeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  const [updatingRequestId, setUpdatingRequestId] = createSignal<string | null>(null)

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      const page = await listAdminFeatureRequests()
      setHasMore(page.hasMore)
      setRequests(page.requests)
    } catch {
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMore = async (): Promise<void> => {
    if (!hasMore() || isLoadingMore()) {
      return
    }

    const offset = requests().length
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    try {
      const page = await listAdminFeatureRequests({offset})
      setRequests((currentRequests) => [...currentRequests, ...page.requests])
      setHasMore(page.hasMore)
    } catch {
      setLoadMoreFailed(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const updateRequest = async (
    input: AdminFeatureRequestStatusInput,
  ): Promise<UpdateFeatureRequestResult> => {
    setUpdatingRequestId(input.requestId)

    try {
      const result = await updateAdminFeatureRequest(input)
      if (result.status === 'updated') {
        await refresh()
      }
      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setUpdatingRequestId(null)
    }
  }

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
    requests,
    updateRequest,
    updatingRequestId,
  }
}

export {FEATURE_REQUEST_STATUSES}
