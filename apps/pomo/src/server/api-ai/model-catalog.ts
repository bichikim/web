import type {AdminApiAiPage, ApiAiModel, ApiAiRoute} from 'src/features/admin-api-ai/contracts'
import type {ApiAiProvider} from './types'

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
  return entries
    .filter(
      (entry, index) =>
        entries.findIndex(
          (candidate) =>
            candidate.providerId === entry.providerId && candidate.model === entry.model,
        ) === index,
    )
    .map((entry) => ({
      ...entry,
      removable: !protectedModels.some(
        (candidate) => candidate.providerId === entry.providerId && candidate.model === entry.model,
      ),
    }))
}
