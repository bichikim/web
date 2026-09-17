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
  readonly isLoading: () => boolean
  readonly loadFailed: () => boolean
  readonly refresh: () => Promise<void>
  readonly requests: () => ReadonlyArray<FeatureRequest>
  readonly updateRequest: (
    input: AdminFeatureRequestStatusInput,
  ) => Promise<UpdateFeatureRequestResult>
  readonly updatingRequestId: () => string | null
}

export const useAdminFeatureRequests = (): AdminFeatureRequestsController => {
  const [requests, setRequests] = createSignal<ReadonlyArray<FeatureRequest>>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [updatingRequestId, setUpdatingRequestId] = createSignal<string | null>(null)

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setLoadFailed(false)

    try {
      setRequests(await listAdminFeatureRequests())
    } catch {
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
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
    isLoading,
    loadFailed,
    refresh,
    requests,
    updateRequest,
    updatingRequestId,
  }
}

export {FEATURE_REQUEST_STATUSES}
