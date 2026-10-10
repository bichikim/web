import type {ApiAiRoute, ApiAiRouting} from 'src/features/admin-api-ai/contracts'
import type {ApiAiKind, ApiAiProvider} from './types'

export const getDefaultApiAiRouting = (
  providers: ReadonlyArray<ApiAiProvider>,
  kind: ApiAiKind,
): ApiAiRouting => {
  const routes = providers.flatMap((provider) => {
    const model = provider.models[kind]
    return model === undefined ? [] : [{model, providerId: provider.id}]
  })
  return {routes}
}

/** Resolves each ordered model against a configured provider's capabilities. */
export const resolveApiAiRoutes = (
  providers: ReadonlyArray<ApiAiProvider>,
  routes: ReadonlyArray<ApiAiRoute>,
  kind: ApiAiKind,
): ReadonlyArray<ApiAiProvider> =>
  routes.map((route) => {
    const provider = providers.find((candidate) => candidate.id === route.providerId)
    if (provider === undefined || provider.models[kind] === undefined) {
      throw new TypeError(`AI route provider does not support ${kind}: ${route.providerId}`)
    }
    return {...provider, models: {...provider.models, [kind]: route.model}}
  })

/** Validates the configured providers in the common cloud-model order. */
export const validateApiAiRouting = (
  providers: ReadonlyArray<ApiAiProvider>,
  routing: ApiAiRouting,
): 'valid' | 'unsupported-provider' =>
  routing.routes.every((route) => providers.some((provider) => provider.id === route.providerId))
    ? 'valid'
    : 'unsupported-provider'

/** Selects compatible routes in the shared order without substituting models. */
export const getCompatibleApiAiRoutes = (
  providers: ReadonlyArray<ApiAiProvider>,
  routes: ReadonlyArray<ApiAiRoute>,
  kind: ApiAiKind,
): ReadonlyArray<ApiAiRoute> =>
  routes.filter((route) =>
    providers.some(
      (provider) => provider.id === route.providerId && provider.models[kind] !== undefined,
    ),
  )
