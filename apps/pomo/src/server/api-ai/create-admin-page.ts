import {type AdminApiAiPage, apiAiRoutingSchema} from 'src/features/admin-api-ai/contracts'
import {getApiAiModelCatalog} from './model-catalog'
import {getDefaultApiAiRouting} from './routing'
import type {ApiAiProvider} from './types'

export interface StoredRouting {
  readonly revision: number
  readonly routing: unknown
}

export interface CreateAdminPageOptions {
  readonly defaults: ReadonlyArray<ApiAiProvider>
  readonly providers: ReadonlyArray<ApiAiProvider>
  readonly stored: StoredRouting | undefined
}

/** Builds the public administration page from a routing snapshot without exposing credentials. */
export const createAdminPage = (options: CreateAdminPageOptions): AdminApiAiPage => {
  const {defaults, providers, stored} = options
  const routing =
    stored === undefined
      ? getDefaultApiAiRouting(defaults, 'cloud-text')
      : apiAiRoutingSchema.parse(stored.routing)
  return {
    ...routing,
    catalog: getApiAiModelCatalog(routing.catalog ?? [], routing.routes, providers),
    providers: providers
      .filter((provider) => provider.models['cloud-text'] !== undefined)
      .map((provider) => ({
        id: provider.id,
        models: provider.models,
        protocol: provider.protocol ?? 'openai-responses-background',
      })),
    revision: stored?.revision ?? 0,
    source: stored === undefined ? 'environment' : 'admin',
  }
}
