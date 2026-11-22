/** Normalizes searched history URLs while preserving non-tracking query encoding. */
export const normalizeHistorySourceUrl = (value: string): string => {
  const url = new URL(value)
  url.hostname = url.hostname.replace(/^www\./u, '')
  url.hash = ''
  const searchParameters = url.search.slice(1).split('&')
  const retainedSearchParameters = searchParameters.filter((parameter) => {
    const separatorIndex = parameter.indexOf('=')
    const name = parameter.slice(0, separatorIndex === -1 ? undefined : separatorIndex)
    const normalizedName = new URLSearchParams(`${name}=`).keys().next().value

    return !normalizedName?.toLowerCase().startsWith('utm_')
  })

  if (retainedSearchParameters.length !== searchParameters.length) {
    url.search =
      retainedSearchParameters.length === 0 ? '' : `?${retainedSearchParameters.join('&')}`
  }

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/u, '')
  }

  return url.href
}

const getArticleIdentity = (url: URL): string | undefined => {
  const articleId = url.pathname.match(/-(?<articleId>\d{6,})$/u)?.groups?.articleId

  return articleId === undefined ? undefined : `${url.hostname}:${articleId}`
}

/** Resolves citations to searched URLs by normalized URL or an unambiguous article identity. */
export const createHistorySourceResolver = (searchSourceUrls: ReadonlyArray<string>) => {
  const sources = searchSourceUrls.map((value) => {
    const normalizedUrl = normalizeHistorySourceUrl(value)

    return {
      identity: getArticleIdentity(new URL(normalizedUrl)),
      normalizedUrl,
      value,
    }
  })
  const sourcesByUrl = new Map(sources.map(({normalizedUrl, value}) => [normalizedUrl, value]))
  const sourcesByArticleIdentity = Map.groupBy(sources, ({identity}) => identity)

  return (value: string): string => {
    const normalizedUrl = normalizeHistorySourceUrl(value)
    const exactSource = sourcesByUrl.get(normalizedUrl)

    if (exactSource !== undefined) {
      return exactSource
    }

    const identity = getArticleIdentity(new URL(normalizedUrl))
    const articleSources =
      identity === undefined ? undefined : sourcesByArticleIdentity.get(identity)

    if (articleSources?.length === 1) {
      return articleSources[0]!.value
    }

    throw new TypeError(
      `A generated source was not returned by OpenAI web search: ${normalizedUrl}`,
    )
  }
}
