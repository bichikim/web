import {createSignal, onMount} from 'solid-js'

import {
  createFeatureRequest,
  type CreateFeatureRequestResult,
  listFeatureRequests,
  voteFeatureRequest,
  type VoteFeatureRequestResult,
} from './api'
import type {CreateFeatureRequestInput, FeatureRequest} from './types'

interface FeatureRequestsRefreshOptions {
  readonly preserveLoadedPages?: boolean
}

export interface FeatureRequestsController {
  readonly createRequest: (input: CreateFeatureRequestInput) => Promise<CreateFeatureRequestResult>
  readonly hasMore: () => boolean
  readonly isLoading: () => boolean
  readonly isLoadingMore: () => boolean
  readonly isSubmitting: () => boolean
  readonly loadFailed: () => boolean
  readonly loadMore: () => Promise<void>
  readonly loadMoreFailed: () => boolean
  readonly refresh: () => Promise<void>
  readonly requests: () => ReadonlyArray<FeatureRequest>
  readonly voteRequest: (requestId: string) => Promise<VoteFeatureRequestResult>
  readonly votingRequestId: () => string | null
}

const preserveCurrentVotesInRefresh = (
  currentRequests: ReadonlyArray<FeatureRequest>,
  refreshedRequests: ReadonlyArray<FeatureRequest>,
): ReadonlyArray<FeatureRequest> => {
  const currentRequestsById = new Map(
    currentRequests.map((request) => [request.id, request] as const),
  )

  return refreshedRequests.map((request) => {
    const currentRequest = currentRequestsById.get(request.id)
    if (currentRequest?.votedByCurrentUser !== true) {
      return request
    }

    return {
      ...request,
      voteCount: Math.max(request.voteCount, currentRequest.voteCount),
      votedByCurrentUser: true,
    }
  })
}

export const useFeatureRequests = (): FeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [votingRequestId, setVotingRequestId] = createSignal<string | null>(null)
  let listGeneration = 0
  let hasLoadedMore = false

  const refresh = async (options: FeatureRequestsRefreshOptions = {}): Promise<void> => {
    const preserveLoadedPages = options.preserveLoadedPages === true
    const previousHasMore = hasMore()
    if (!preserveLoadedPages) {
      hasLoadedMore = false
    }

    listGeneration += 1
    const generation = listGeneration
    setIsLoading(true)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      const page = await listFeatureRequests()
      if (generation !== listGeneration) {
        return
      }

      if (preserveLoadedPages) {
        setHasMore(previousHasMore)
        setRequests((currentRequests) => {
          const refreshedRequestIds = new Set(page.requests.map((request) => request.id))
          const refreshedRequests = [
            ...page.requests,
            ...currentRequests.filter((request) => !refreshedRequestIds.has(request.id)),
          ]
          return preserveCurrentVotesInRefresh(currentRequests, refreshedRequests)
        })
      } else {
        setHasMore(page.hasMore)
        setRequests((currentRequests) =>
          preserveCurrentVotesInRefresh(currentRequests, page.requests),
        )
      }
    } catch {
      if (generation !== listGeneration) {
        return
      }

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

    const offset = requests().length
    const generation = listGeneration
    setIsLoadingMore(true)
    setLoadMoreFailed(false)

    try {
      const page = await listFeatureRequests({offset})
      if (generation !== listGeneration) {
        return
      }

      setRequests((currentRequests) => [...currentRequests, ...page.requests])
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

  const createRequest = async (
    input: CreateFeatureRequestInput,
  ): Promise<CreateFeatureRequestResult> => {
    setIsSubmitting(true)

    try {
      const result = await createFeatureRequest(input)

      if (result.status === 'created') {
        await refresh({preserveLoadedPages: hasLoadedMore})
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateRequestVote = (requestId: string, hasNewVote: boolean): void => {
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              voteCount: hasNewVote ? request.voteCount + 1 : request.voteCount,
              votedByCurrentUser: true,
            }
          : request,
      ),
    )
  }

  const voteRequest = async (requestId: string): Promise<VoteFeatureRequestResult> => {
    setVotingRequestId(requestId)

    try {
      const result = await voteFeatureRequest(requestId)

      if (result.status === 'voted' || result.status === 'already-voted') {
        updateRequestVote(requestId, result.status === 'voted')
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setVotingRequestId(null)
    }
  }

  onMount(() => {
    refresh().catch(() => undefined)
  })

  return {
    createRequest,
    hasMore,
    isLoading,
    isLoadingMore,
    isSubmitting,
    loadFailed,
    loadMore,
    loadMoreFailed,
    refresh,
    requests,
    voteRequest,
    votingRequestId,
  }
}
