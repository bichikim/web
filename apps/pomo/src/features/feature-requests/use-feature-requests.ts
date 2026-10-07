import {createEffect, createMemo, createSignal, on} from 'solid-js'

import {useAuth} from '../auth/AuthProvider'
import {featureRequestsQuery, invalidateFeatureRequestPages} from './page-query'
import {getFeatureRequestsSessionKey} from './get-feature-requests-session-key'
import {useFeatureRequestList} from './use-feature-request-list'

import {
  createFeatureRequest,
  type CreateFeatureRequestResult,
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
  const authentication = useAuth()
  const scope = createMemo(() => getFeatureRequestsSessionKey(authentication.state()))
  const list = useFeatureRequestList({
    pageQuery: featureRequestsQuery,
    reconcileRefresh: preserveCurrentVotesInRefresh,
    refreshLoadedPages: true,
    scope,
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
  createEffect(
    on(scope, () => {
      setIsSubmitting(false)
      setVotingRequestId(null)
    }),
  )
  const createRequest = async (
    input: CreateFeatureRequestInput,
  ): Promise<CreateFeatureRequestResult> => {
    const session = scope()
    setIsSubmitting(true)

    try {
      const result = await createFeatureRequest(input)

      if (result.status === 'created') {
        await invalidateFeatureRequestPages()
        if (session === scope()) {
          await list.refreshAfterMutation()
        }
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      if (session === scope()) {
        setIsSubmitting(false)
      }
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
    const session = scope()
    setVotingRequestId(requestId)

    try {
      const result = await voteFeatureRequest(requestId)

      if (result.status === 'voted' || result.status === 'already-voted') {
        await invalidateFeatureRequestPages()
        if (session === scope()) {
          updateRequestVote(requestId, result.status === 'voted')
        }
      }

      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      if (session === scope()) {
        setVotingRequestId(null)
      }
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
