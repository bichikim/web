import {z} from 'zod'

import {apiJson, apiJsonRequest, parseJsonResponse} from '../api-json'
import {readStoredAppSession} from '../user-auth/app-session'
import {
  type CreateFeatureRequestInput,
  FEATURE_REQUEST_STATUSES,
  type FeatureRequest,
} from './types'

const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_NOT_FOUND = 404
const HTTP_UNAUTHORIZED = 401

const featureRequestSchema: z.ZodType<FeatureRequest> = z.object({
  createdAt: z.string().datetime({offset: true}),
  description: z.string(),
  id: z.string().uuid(),
  status: z.enum(FEATURE_REQUEST_STATUSES),
  targetVoteCount: z.number().int().positive().nullable(),
  title: z.string(),
  voteCount: z.number().int().nonnegative(),
  votedByCurrentUser: z.boolean(),
})
const featureRequestsResponseSchema = z.object({requests: z.array(featureRequestSchema)})
const voteResponseSchema = z.object({status: z.enum(['already-voted', 'voted'])})

interface FeatureRequestRequestOptions {
  readonly credentials?: RequestCredentials
  readonly headers?: HeadersInit
}

export type CreateFeatureRequestResult =
  | {readonly status: 'created'}
  | {readonly status: 'invalid'}
  | {readonly status: 'unavailable'}
  | {readonly status: 'unauthorized'}

export type VoteFeatureRequestResult =
  | {readonly status: 'already-voted'}
  | {readonly status: 'closed'}
  | {readonly status: 'not-found'}
  | {readonly status: 'unavailable'}
  | {readonly status: 'unauthorized'}
  | {readonly status: 'voted'}

export type UpdateFeatureRequestResult =
  | {readonly status: 'conflict'}
  | {readonly status: 'invalid'}
  | {readonly status: 'not-found'}
  | {readonly status: 'unavailable'}
  | {readonly status: 'updated'}

const createRequestOptions = async (): Promise<FeatureRequestRequestOptions> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS !== 'true') {
    return {credentials: 'include'}
  }

  const token = await readStoredAppSession()
  return token === null ? {} : {headers: {Authorization: `Bearer ${token}`}}
}

export const listFeatureRequests = async (): Promise<ReadonlyArray<FeatureRequest>> =>
  (
    await apiJson('feature-requests', {
      ...(await createRequestOptions()),
      responseSchema: featureRequestsResponseSchema,
    })
  ).requests

export const createFeatureRequest = async (
  input: CreateFeatureRequestInput,
): Promise<CreateFeatureRequestResult> => {
  const response = await apiJsonRequest('feature-requests', {
    ...(await createRequestOptions()),
    body: input,
    method: 'POST',
  })

  if (response.status === HTTP_UNAUTHORIZED) {
    return {status: 'unauthorized'}
  }

  if (response.status === HTTP_BAD_REQUEST) {
    return {status: 'invalid'}
  }

  if (!response.ok) {
    throw new Error(`Feature request creation failed with status ${response.status}`)
  }

  return {status: 'created'}
}

export const voteFeatureRequest = async (requestId: string): Promise<VoteFeatureRequestResult> => {
  const response = await apiJsonRequest(`feature-requests/${encodeURIComponent(requestId)}/vote`, {
    ...(await createRequestOptions()),
    method: 'POST',
  })

  if (response.status === HTTP_UNAUTHORIZED) {
    return {status: 'unauthorized'}
  }

  if (response.status === HTTP_NOT_FOUND) {
    return {status: 'not-found'}
  }

  if (response.status === HTTP_CONFLICT) {
    return {status: 'closed'}
  }

  if (!response.ok) {
    throw new Error(`Feature request vote failed with status ${response.status}`)
  }

  return parseJsonResponse(response, voteResponseSchema)
}

export const listAdminFeatureRequests = async (): Promise<ReadonlyArray<FeatureRequest>> =>
  (
    await apiJson('admin/feature-requests', {
      credentials: 'include',
      responseSchema: featureRequestsResponseSchema,
    })
  ).requests

export const updateAdminFeatureRequest = async (input: {
  readonly requestId: string
  readonly status: FeatureRequest['status']
  readonly targetVoteCount: number | null
}): Promise<UpdateFeatureRequestResult> => {
  const response = await apiJsonRequest(
    `admin/feature-requests/${encodeURIComponent(input.requestId)}/status`,
    {
      body: {status: input.status, targetVoteCount: input.targetVoteCount},
      credentials: 'include',
      method: 'PATCH',
    },
  )

  if (response.status === HTTP_BAD_REQUEST) {
    return {status: 'invalid'}
  }

  if (response.status === HTTP_CONFLICT) {
    return {status: 'conflict'}
  }

  if (response.status === HTTP_NOT_FOUND) {
    return {status: 'not-found'}
  }

  if (!response.ok) {
    throw new Error(`Feature request status update failed with status ${response.status}`)
  }

  return {status: 'updated'}
}
