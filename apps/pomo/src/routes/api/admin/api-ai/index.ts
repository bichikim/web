import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'
import {apiAiRoutingUpdateSchema} from 'src/features/admin-api-ai/contracts'
import {getApiAiProviders, getConfiguredApiAiProviders} from 'src/server/api-ai/providers'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readJsonBody} from 'src/server/http/body'
import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import {noStoreJson} from 'src/server/http/response'
import {readAdminApiAiPage, updateApiAiRouting} from 'src/server/repositories/api-ai/routing'

const MAXIMUM_BODY_BYTES = 8192
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_SERVICE_UNAVAILABLE = 503
const querySchema = z.object({}).strict()

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const query = querySchema.safeParse(Object.fromEntries(new URL(event.request.url).searchParams))
  if (!query.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  try {
    const page = await readAdminApiAiPage(getConfiguredApiAiProviders(), getApiAiProviders())
    return noStoreJson(page, {cookies: authorization.cookies})
  } catch (error: unknown) {
    console.error('Failed to read AI routing', error)
    return noStoreJson(
      {error: 'ai_routing_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

export const PUT = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const body = await readJsonBody(event, MAXIMUM_BODY_BYTES)
  const update = apiAiRoutingUpdateSchema.safeParse(body.success ? body.body : null)
  if (!update.success) {
    return invalidJsonBodyResponse(body, {cookies: authorization.cookies, error: 'invalid_request'})
  }
  try {
    const providers = getConfiguredApiAiProviders()
    const saved = await updateApiAiRouting(update.data, providers, new Date())
    if (saved === 'conflict') {
      return noStoreJson(
        {error: 'revision_conflict'},
        {cookies: authorization.cookies, status: HTTP_CONFLICT},
      )
    }
    if (saved === 'invalid') {
      return noStoreJson(
        {error: 'invalid_routing'},
        {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
      )
    }
    return noStoreJson(await readAdminApiAiPage(providers, getApiAiProviders()), {
      cookies: authorization.cookies,
    })
  } catch (error: unknown) {
    console.error('Failed to save AI routing', error)
    return noStoreJson(
      {error: 'ai_routing_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
