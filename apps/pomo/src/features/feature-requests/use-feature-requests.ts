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
  readonly isLoading: () => boolean
  readonly isSubmitting: () => boolean
  readonly loadFailed: () => boolean
  readonly refresh: () => Promise<void>
  readonly requests: () => ReadonlyArray<FeatureRequest>
  readonly voteRequest: (requestId: string) => Promise<VoteFeatureRequestResult>
  readonly votingRequestId: () => string | null
}

export const useFeatureRequests = (): FeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [votingRequestId, setVotingRequestId] = createSignal<string | null>(null)

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setLoadFailed(false)

    try {
      setRequests(await listFeatureRequests())
    } catch {
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
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
    isLoading,
    isSubmitting,
    loadFailed,
    refresh,
    requests,
    voteRequest,
    votingRequestId,
  }
}
