import {uniqBy} from 'es-toolkit/array'
import type {AdminApiAiPage, ApiAiModel, ApiAiRoute} from 'src/features/admin-api-ai/contracts'
import type {ApiAiProvider} from './types'

const modelKey = (entry: ApiAiRoute): string => JSON.stringify([entry.providerId, entry.model])

/** Combines registered models with configured and selected models without changing their order. */
export const getApiAiModelCatalog = (
  catalog: ReadonlyArray<ApiAiModel>,
  routes: ReadonlyArray<ApiAiRoute>,
  providers: ReadonlyArray<ApiAiProvider>,
): AdminApiAiPage['catalog'] => {
  const configured = providers.flatMap((provider) => {
    const model = provider.models['cloud-text']
    return model === undefined ? [] : [{model, providerId: provider.id}]
  })
  const protectedModels = [...routes, ...configured]
  const entries = [...catalog, ...protectedModels.map((entry) => ({...entry, label: ''}))]
  const protectedKeys = new Set(protectedModels.map(modelKey))
  return uniqBy(entries, modelKey).map((entry) => ({
    ...entry,
    removable: !protectedKeys.has(modelKey(entry)),
  }))
}
