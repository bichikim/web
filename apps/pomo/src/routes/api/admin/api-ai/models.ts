import type {APIEvent} from '@solidjs/start/server'
import {apiAiCatalogUpdateSchema} from 'src/features/admin-api-ai/contracts'
import {getApiAiProviders, getConfiguredApiAiProviders} from 'src/server/api-ai/providers'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readJsonBody} from 'src/server/http/body'
import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import {noStoreJson} from 'src/server/http/response'
import {readAdminApiAiPage, updateApiAiCatalog} from 'src/server/repositories/api-ai/routing'

const MAXIMUM_BODY_BYTES = 8192
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_UNAVAILABLE = 503

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const body = await readJsonBody(event, MAXIMUM_BODY_BYTES)
  const update = apiAiCatalogUpdateSchema.safeParse(body.success ? body.body : null)
  if (!update.success) {
    return invalidJsonBodyResponse(body, {cookies: authorization.cookies, error: 'invalid_request'})
  }
  try {
    const providers = getConfiguredApiAiProviders()
    const defaults = getApiAiProviders()
    const result = await updateApiAiCatalog(update.data, providers, defaults, new Date())
    if (result !== 'saved') {
      return noStoreJson(
        {error: result === 'conflict' ? 'revision_conflict' : 'invalid_catalog'},
        {
          cookies: authorization.cookies,
          status: result === 'conflict' ? HTTP_CONFLICT : HTTP_BAD_REQUEST,
        },
      )
    }
    return noStoreJson(await readAdminApiAiPage(providers, defaults), {
      cookies: authorization.cookies,
    })
  } catch (error: unknown) {
    console.error('Failed to update AI model catalog', error)
    return noStoreJson(
      {error: 'ai_catalog_unavailable'},
      {cookies: authorization.cookies, status: HTTP_UNAVAILABLE},
    )
  }
}
