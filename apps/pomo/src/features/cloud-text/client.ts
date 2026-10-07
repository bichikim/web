import {z} from 'zod'
import * as m from '@paraglide/message'
import {apiJsonRequest, type ApiJsonRequestOptions, parseJsonResponse} from '../api-json'
import {readStoredAppSession} from '../user-auth/app-session'
import {
  type CloudTextRequest,
  type CloudTextResponse,
  cloudTextResponseSchema,
  type CloudTextUsage,
  cloudTextUsageSchema,
} from './contracts'

export const CLOUD_TEXT_USAGE_EVENT = 'pomo:cloud-text-usage'
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
    return parseJsonResponse(response, cloudTextResponseSchema, signal)
  } finally {
    globalThis.dispatchEvent?.(new Event(CLOUD_TEXT_USAGE_EVENT))
  }
}
