import {createOffsetListController} from './create-offset-list-controller'
import {createSignal} from 'solid-js'

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
  const list = createOffsetListController({
    loadPage: listFeatureRequests,
    reconcileRefresh: preserveCurrentVotesInRefresh,
  })
  const {
    requests,
    hasMore,
    isLoading,
    isLoadingMore,
    loadFailed,
    loadMore,
    loadMoreFailed,
    refresh,
  } = list
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [votingRequestId, setVotingRequestId] = createSignal<string | null>(null)
  const createRequest = async (
    input: CreateFeatureRequestInput,
  ): Promise<CreateFeatureRequestResult> => {
    setIsSubmitting(true)

    try {
      const result = await createFeatureRequest(input)

      if (result.status === 'created') {
        await list.refreshAfterMutation()
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateRequestVote = (requestId: string, hasNewVote: boolean): void => {
    list.updateRequest(requestId, (request) => ({
      ...request,
      voteCount: hasNewVote ? request.voteCount + 1 : request.voteCount,
      votedByCurrentUser: true,
    }))
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
