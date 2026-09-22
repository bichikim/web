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

export const useAdminFeatureRequests = (): AdminFeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  const [updatingRequestId, setUpdatingRequestId] = createSignal<string | null>(null)
  let listGeneration = 0
  let hasLoadedMore = false
  let nextOffset = 0

  const refresh = async (): Promise<void> => {
    const previousHasMore = hasMore()
    const preserveLoadedPages = hasLoadedMore
    listGeneration += 1
    const generation = listGeneration
    setIsLoading(true)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      const page = await listAdminFeatureRequests()
      if (generation !== listGeneration) {
        return
      }

      nextOffset = page.requests.length
      setHasMore(preserveLoadedPages ? previousHasMore : page.hasMore)
      if (preserveLoadedPages) {
        setRequests((currentRequests) => {
          const refreshedRequestIds = new Set(page.requests.map((request) => request.id))
          const refreshedRequests = [
            ...page.requests,
            ...currentRequests.filter((request) => !refreshedRequestIds.has(request.id)),
          ]
          return refreshedRequests
        })
      } else {
        setRequests(page.requests)
      }
    } catch {
      if (generation !== listGeneration) {
        return
      }

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
      const page = await listAdminFeatureRequests({offset})
      if (generation !== listGeneration) {
        return
      }

      nextOffset += page.requests.length
      setRequests((currentRequests) => appendNewRequests(currentRequests, page.requests))
      setHasMore(page.hasMore)
      hasLoadedMore = true
    } catch {
      if (generation !== listGeneration) {
        return
      }

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
        setRequests((currentRequests) =>
          currentRequests.map((request) =>
            request.id === input.requestId
              ? {...request, status: input.status, targetVoteCount: input.targetVoteCount}
              : request,
          ),
        )
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
