import type {FeedProvider} from './contract'

const FEED_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

const requireText = (value: string, field: string): void => {
  if (value.trim().length === 0) {
    throw new TypeError(`Feed ${field} must not be empty`)
  }
}

const requireAbsoluteHttpUrl = (value: string, field: string): void => {
  let url: URL

  try {
    url = new URL(value)
  } catch (cause) {
    throw new TypeError(`Feed ${field} must be an absolute URL`, {cause})
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError(`Feed ${field} must use the http or https protocol`)
  }
}

const validateProvider = (provider: FeedProvider): void => {
  const {definition} = provider

  if (!FEED_SLUG_PATTERN.test(definition.slug)) {
    throw new TypeError(`Invalid feed slug: ${definition.slug}`)
  }

  requireText(definition.title, 'title')
  requireText(definition.description, 'description')
  requireText(definition.language, 'language')
  requireAbsoluteHttpUrl(definition.homeUrl, 'homeUrl')
}

export interface FeedRegistry {
  readonly getProvider: (slug: string) => FeedProvider | undefined
  readonly listProviders: () => ReadonlyArray<FeedProvider>
}

/** Creates an immutable lookup of validated feed providers. */
export const createFeedRegistry = (providers: ReadonlyArray<FeedProvider>): FeedRegistry => {
  const providersBySlug = new Map<string, FeedProvider>()

  for (const provider of providers) {
    validateProvider(provider)
    const {slug} = provider.definition

    if (providersBySlug.has(slug)) {
      throw new TypeError(`Duplicate feed slug: ${slug}`)
    }

    providersBySlug.set(slug, provider)
  }

  const providerList = Object.freeze([...providersBySlug.values()])

  return {
    getProvider: (slug) => providersBySlug.get(slug),
    listProviders: () => providerList,
  }
}
