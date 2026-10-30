import type {ApiAiProvider} from './types'

/**
 * Resolves default cloud-text capabilities without removing providers or history models.
 * An absent selection disables queued providers; a selected provider must support cloud-text.
 */
export const resolveDefaultProviders = (
  providers: ReadonlyArray<ApiAiProvider>,
  selected: string | undefined,
): ReadonlyArray<ApiAiProvider> => {
  if (
    selected !== undefined &&
    !providers.some(
      (provider) => provider.id === selected && provider.models['cloud-text'] !== undefined,
    )
  ) {
    throw new TypeError(`AI cloud-text provider is not configured: ${selected}`)
  }
  return providers.map((provider) => {
    const enabled =
      selected === undefined
        ? provider.protocol !== 'openrouter-responses-queue'
        : provider.id === selected
    if (enabled) {
      return provider
    }
    const {history} = provider.models
    return {...provider, models: history === undefined ? {} : {history}}
  })
}
