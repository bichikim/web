import {createEffect, createMemo, createSignal, on} from 'solid-js'

import {useAuth} from '../auth/AuthProvider'
import {featureRequestsQuery, invalidateFeatureRequestPages} from './page-query'
import {getFeatureRequestsSessionKey} from './get-feature-requests-session-key'
import {type FeatureRequestListView, useFeatureRequestList} from './use-feature-request-list'

import {
  createFeatureRequest,
  type CreateFeatureRequestResult,
  voteFeatureRequest,
  type VoteFeatureRequestResult,
} from './api'
import type {CreateFeatureRequestInput, FeatureRequest} from './types'

export interface FeatureRequestsController extends FeatureRequestListView {
  readonly createRequest: (input: CreateFeatureRequestInput) => Promise<CreateFeatureRequestResult>
  readonly isSubmitting: () => boolean
  readonly isVoting: (requestId: string) => boolean
  readonly voteRequest: (requestId: string) => Promise<VoteFeatureRequestResult>
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
  const [pendingVotes, setPendingVotes] = createSignal(
    new Map<string, Promise<VoteFeatureRequestResult>>(),
  )
  createEffect(
    on(scope, () => {
      setIsSubmitting(false)
      setPendingVotes(new Map())
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

  const voteRequest = (requestId: string): Promise<VoteFeatureRequestResult> => {
    const existing = pendingVotes().get(requestId)
    if (existing !== undefined) {
      return existing
    }
    const session = scope()
    const isCurrent = () => session === scope() && pendingVotes().get(requestId) === pending
    const pending: Promise<VoteFeatureRequestResult> = Promise.resolve().then(async () => {
      try {
        const result = await voteFeatureRequest(requestId)
        if (result.status === 'voted' || result.status === 'already-voted') {
          await invalidateFeatureRequestPages()
          if (isCurrent()) {
            updateRequestVote(requestId, result.status === 'voted')
          }
        }
        return result
      } catch {
        return {status: 'unavailable'}
      } finally {
        if (isCurrent()) {
          const next = new Map(pendingVotes())
          next.delete(requestId)
          setPendingVotes(next)
        }
      }
    })
    setPendingVotes((current) => new Map(current).set(requestId, pending))
    return pending
  }

  return {
    createRequest,
    hasMore,
    isLoading,
    isLoadingMore,
    isSubmitting,
    isVoting: (requestId) => pendingVotes().has(requestId),
    loadFailed,
    loadMore,
    loadMoreFailed,
    refresh,
    requests,
    voteRequest,
  }
}
