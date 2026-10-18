import {apiJson, apiJsonRequest, parseJsonResponse} from '../api-json'
import {
  type AdminApiAiPage,
  adminApiAiPageSchema,
  type ApiAiCatalogUpdate,
  type ApiAiModelTestResult,
  apiAiModelTestResultSchema,
  type ApiAiRoute,
  type ApiAiRoutingUpdate,
} from './contracts'

interface RoutingSaved {
  readonly kind: 'saved'
  readonly page: AdminApiAiPage
}
interface RoutingRejected {
  readonly kind: 'invalid' | 'conflict' | 'forbidden' | 'unavailable'
}
export type SaveApiAiRoutingResult = RoutingSaved | RoutingRejected

export const readAdminApiAiPage = () =>
  apiJson('admin/api-ai', {
    credentials: 'include',
    responseSchema: adminApiAiPageSchema,
  })

/** Persists an ordered model policy without retrying a revision-changing request. */
export const saveAdminApiAiRouting = async (
  update: ApiAiRoutingUpdate,
): Promise<SaveApiAiRoutingResult> => {
  return persistConfiguration('admin/api-ai', 'PUT', update)
}

const persistConfiguration = async (
  path: string,
  method: 'PUT' | 'POST',
  body: ApiAiRoutingUpdate | ApiAiCatalogUpdate,
): Promise<SaveApiAiRoutingResult> => {
  try {
    const response = await apiJsonRequest(path, {
      body,
      credentials: 'include',
      method,
      retry: false,
    })
    if (response.ok) {
      return {kind: 'saved', page: await parseJsonResponse(response, adminApiAiPageSchema)}
    }
    const HTTP_BAD_REQUEST = 400
    const HTTP_UNAUTHORIZED = 401
    const HTTP_FORBIDDEN = 403
    const HTTP_CONFLICT = 409
    switch (response.status) {
      case HTTP_BAD_REQUEST:
        return {kind: 'invalid'}
      case HTTP_UNAUTHORIZED:
      case HTTP_FORBIDDEN:
        return {kind: 'forbidden'}
      case HTTP_CONFLICT:
        return {kind: 'conflict'}
      default:
        return {kind: 'unavailable'}
    }
  } catch {
    return {kind: 'unavailable'}
  }
}

/** Persists one registration change against the shared server-setting revision. */
export const saveAdminApiAiCatalog = (
  update: ApiAiCatalogUpdate,
): Promise<SaveApiAiRoutingResult> => persistConfiguration('admin/api-ai/models', 'POST', update)

/** Tests a registered model without transport retries. */
export const testAdminApiAiModel = async (entry: ApiAiRoute): Promise<ApiAiModelTestResult> => {
  try {
    const response = await apiJsonRequest('admin/api-ai/test', {
      body: entry,
      credentials: 'include',
      method: 'POST',
      retry: false,
    })
    if (response.ok) {
      return await parseJsonResponse(response, apiAiModelTestResultSchema)
    }
    return {
      details: null,
      kind: 'failure',
      message: '모델 등록과 관리자 권한을 확인해 주세요.',
      retryAfter: null,
      status: response.status,
    }
  } catch {
    return {
      details: null,
      kind: 'failure',
      message: '테스트 응답을 받지 못했어요. 네트워크 상태를 확인해 주세요.',
      retryAfter: null,
      status: null,
    }
  }
}
