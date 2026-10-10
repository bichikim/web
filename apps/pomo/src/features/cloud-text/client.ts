// oxlint-disable no-await-in-loop -- Consume notification frames and reconnect in order.
import {z} from 'zod'
import * as m from '@paraglide/message'
import {apiJsonRequest, type ApiJsonRequestOptions, parseJsonResponse} from '../api-json'
import {type CloudTextConnectionResult, readCloudTextEvents} from './job-events'
import {readStoredAppSession} from '../user-auth/app-session'
import {
  cloudTextAcceptedSchema,
  type CloudTextRequest,
  type CloudTextResponse,
  cloudTextResponseSchema,
  type CloudTextUsage,
  cloudTextUsageSchema,
} from './contracts'

export const CLOUD_TEXT_USAGE_EVENT = 'pomo:cloud-text-usage'
const HTTP_ACCEPTED = 202
const MAXIMUM_EVENT_RECONNECTIONS = 5
const errorSchema = z.object({error: z.string()})

const createRequestOptions = async (): Promise<
  Pick<ApiJsonRequestOptions, 'headers' | 'credentials'>
> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS !== 'true') {
    return {credentials: 'include'}
  }
  const token = await readStoredAppSession()
  return token === null ? {} : {headers: {Authorization: `Bearer ${token}`}}
}

const checkResponse = async (response: Response): Promise<void> => {
  if (response.ok) {
    return
  }
  const error = await parseJsonResponse(response, errorSchema)
  switch (error.error) {
    case 'unauthorized':
      throw new Error(m.cloud_text_login_required())
    case 'daily_limit':
      throw new Error(m.cloud_text_daily_limit())
    case 'pending':
      throw new Error(m.cloud_text_pending())
    default:
      throw new Error(m.cloud_text_failed())
  }
}

const readJobConnection = async (
  requestId: string,
  signal: AbortSignal,
): Promise<CloudTextConnectionResult> => {
  const options = {...(await createRequestOptions()), retry: false as const, signal}
  let notifications: Response
  try {
    notifications = await apiJsonRequest(`cloud-text?requestId=${requestId}&events=true`, options)
  } catch (cause: unknown) {
    signal.throwIfAborted()
    if (
      cause instanceof TypeError ||
      (cause instanceof DOMException && cause.name === 'NetworkError')
    ) {
      return {cause, kind: 'disconnected'}
    }
    throw cause
  }
  await checkResponse(notifications)
  if (notifications.body === null) {
    throw new Error(m.cloud_text_failed())
  }
  return readCloudTextEvents(notifications.body, signal)
}

const cancelRequest = async (requestId: string): Promise<void> => {
  try {
    const response = await apiJsonRequest(`cloud-text?requestId=${requestId}`, {
      ...(await createRequestOptions()),
      method: 'DELETE',
      retry: false,
    })
    await checkResponse(response)
  } finally {
    globalThis.dispatchEvent?.(new Event(CLOUD_TEXT_USAGE_EVENT))
  }
}

export const readCloudTextUsage = async (): Promise<CloudTextUsage> => {
  const response = await apiJsonRequest('cloud-text', await createRequestOptions())
  await checkResponse(response)
  return parseJsonResponse(response, cloudTextUsageSchema)
}

export const requestCloudText = async (
  request: CloudTextRequest,
  signal: AbortSignal,
): Promise<CloudTextResponse> => {
  try {
    const response = await apiJsonRequest('cloud-text', {
      ...(await createRequestOptions()),
      body: request,
      method: 'POST',
      retry: false,
      signal,
    })
    await checkResponse(response)
    if (response.status !== HTTP_ACCEPTED) {
      return parseJsonResponse(response, cloudTextResponseSchema, signal)
    }
    const accepted = await parseJsonResponse(response, cloudTextAcceptedSchema, signal)
    for (let connection = 0; connection < MAXIMUM_EVENT_RECONNECTIONS; connection += 1) {
      signal.throwIfAborted()
      const result = await readJobConnection(accepted.requestId, signal)
      switch (result.kind) {
        case 'complete':
          return result.response
        case 'failed':
        case 'cancelled':
          throw new Error(m.cloud_text_failed())
        case 'disconnected':
          break
        default: {
          const exhaustive: never = result
          return exhaustive
        }
      }
    }
    throw new Error(m.cloud_text_failed())
  } finally {
    if (signal.aborted) {
      cancelRequest(request.requestId).catch((error: unknown) => {
        console.error('Failed to request cloud text cancellation', error)
      })
    }
    globalThis.dispatchEvent?.(new Event(CLOUD_TEXT_USAGE_EVENT))
  }
}
