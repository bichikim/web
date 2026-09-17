import {createSignal, onMount} from 'solid-js'

import {
  createFeatureRequest,
  type CreateFeatureRequestResult,
  listFeatureRequests,
  voteFeatureRequest,
  type VoteFeatureRequestResult,
} from './api'
import type {CreateFeatureRequestInput, FeatureRequest} from './types'

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

export const useFeatureRequests = (): FeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [votingRequestId, setVotingRequestId] = createSignal<string | null>(null)

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setLoadFailed(false)
    setLoadMoreFailed(false)
    setHasMore(false)

    try {
      const page = await listFeatureRequests()
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
      const page = await listFeatureRequests({offset})
      setRequests((currentRequests) => [...currentRequests, ...page.requests])
      setHasMore(page.hasMore)
    } catch {
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
        await refresh()
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setIsSubmitting(false)
    }
  }

  const voteRequest = async (requestId: string): Promise<VoteFeatureRequestResult> => {
    setVotingRequestId(requestId)

    try {
      const result = await voteFeatureRequest(requestId)

      if (result.status === 'voted' || result.status === 'already-voted') {
        await refresh()
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
