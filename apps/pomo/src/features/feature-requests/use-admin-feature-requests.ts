import {createOffsetListController} from './create-offset-list-controller'
import {createSignal} from 'solid-js'

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
  const list = createOffsetListController({loadPage: listAdminFeatureRequests})
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
  const [updatingRequestId, setUpdatingRequestId] = createSignal<string | null>(null)
  const updateRequest = async (
    input: AdminFeatureRequestStatusInput,
  ): Promise<UpdateFeatureRequestResult> => {
    setUpdatingRequestId(input.requestId)

    try {
      const result = await updateAdminFeatureRequest(input)
      if (result.status === 'updated') {
        list.updateRequest(input.requestId, (request) => ({
          ...request,
          status: input.status,
          targetVoteCount: input.targetVoteCount,
        }))
      }
      return result
    } catch {
      return {status: 'unavailable'}
    } finally {
      setUpdatingRequestId(null)
    }
  }

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
