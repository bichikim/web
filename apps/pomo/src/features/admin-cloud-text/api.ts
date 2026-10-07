import {apiJson, apiJsonRequest, parseJsonResponse} from '../api-json'
import {
  adminCloudTextPageSchema,
  type AdminCloudTextQuery,
  type AdminCloudTextUser,
  adminCloudTextUserSchema,
  type CloudTextLimitUpdate,
} from './contracts'

const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404

export type UpdateCloudTextLimitResult =
  | {readonly kind: 'updated'; readonly user: AdminCloudTextUser}
  | {readonly kind: 'invalid' | 'not-found' | 'forbidden' | 'unavailable'}

export const readAdminCloudTextUsers = (query: AdminCloudTextQuery) => {
  const search = new URLSearchParams(Object.entries(query))
  return apiJson(`admin/cloud-text?${search}`, {
    credentials: 'include',
    responseSchema: adminCloudTextPageSchema,
  })
}

/** Updates a user's persistent allowance or restores the default. */
export const updateAdminCloudTextLimit = async (
  options: CloudTextLimitUpdate & {readonly userId: string},
): Promise<UpdateCloudTextLimitResult> =>
  mutateAdminCloudTextUser(`admin/cloud-text/${options.userId}`, {
    body: {dailyLimit: options.dailyLimit},
    method: 'PATCH',
  })

/** Resets today's usage without changing the user's daily allowance. */
export const resetAdminCloudTextUsage = (userId: string): Promise<UpdateCloudTextLimitResult> =>
  mutateAdminCloudTextUser(`admin/cloud-text/${userId}/reset`, {method: 'POST'})

interface AdminCloudTextMutation {
  readonly body?: CloudTextLimitUpdate
  readonly method: 'PATCH' | 'POST'
}

const mutateAdminCloudTextUser = async (
  path: string,
  options: AdminCloudTextMutation,
): Promise<UpdateCloudTextLimitResult> => {
  try {
    const response = await apiJsonRequest(path, {
      ...options,
      credentials: 'include',
      retry: false,
    })
    if (response.ok) {
      return {kind: 'updated', user: await parseJsonResponse(response, adminCloudTextUserSchema)}
    }
    switch (response.status) {
      case HTTP_BAD_REQUEST:
        return {kind: 'invalid'}
      case HTTP_UNAUTHORIZED:
      case HTTP_FORBIDDEN:
        return {kind: 'forbidden'}
      case HTTP_NOT_FOUND:
        return {kind: 'not-found'}
      default:
        return {kind: 'unavailable'}
    }
  } catch {
    return {kind: 'unavailable'}
  }
}
