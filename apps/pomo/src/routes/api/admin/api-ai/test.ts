import type {APIEvent} from '@solidjs/start/server'
import {apiAiModelTestSchema} from 'src/features/admin-api-ai/contracts'
import {getApiAiProviders, getConfiguredApiAiProviders} from 'src/server/api-ai/providers'
import {testProviderModel} from 'src/server/api-ai/test-provider-model'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readJsonBody} from 'src/server/http/body'
import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import {noStoreJson} from 'src/server/http/response'
import {readAdminApiAiPage} from 'src/server/repositories/api-ai/routing'

const MAXIMUM_BODY_BYTES = 8192
const HTTP_BAD_REQUEST = 400
const HTTP_UNAVAILABLE = 503

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const body = await readJsonBody(event, MAXIMUM_BODY_BYTES)
  const selection = apiAiModelTestSchema.safeParse(body.success ? body.body : null)
  if (!selection.success) {
    return invalidJsonBodyResponse(body, {cookies: authorization.cookies, error: 'invalid_request'})
  }
  try {
    const providers = getConfiguredApiAiProviders()
    const page = await readAdminApiAiPage(providers, getApiAiProviders())
    const entry = selection.data
    const registered = page.catalog.some(
      (model) => model.providerId === entry.providerId && model.model === entry.model,
    )
    const provider = providers.find((candidate) => candidate.id === entry.providerId)
    if (!registered || provider === undefined) {
      return noStoreJson(
        {error: 'unregistered_model'},
        {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
      )
    }
    return noStoreJson(await testProviderModel(provider, entry.model), {
      cookies: authorization.cookies,
    })
  } catch (error: unknown) {
    console.error('Failed to prepare AI model test', error)
    return noStoreJson(
      {error: 'ai_test_unavailable'},
      {cookies: authorization.cookies, status: HTTP_UNAVAILABLE},
    )
  }
}
