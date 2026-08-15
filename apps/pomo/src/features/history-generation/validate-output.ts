import {
  type HistoricalMomentDraft,
  type HistoryGenerationOutput,
  historyGenerationOutputSchema,
  type HistorySourcePolicy,
} from './contract'

interface ValidateHistoryOutputOptions {
  readonly outputText: string
  readonly policy: HistorySourcePolicy
  readonly requiredTitles?: ReadonlyArray<string>
  readonly searchSourceUrls: ReadonlyArray<string>
  readonly targetDay: number
  readonly targetMonth: number
}

const normalizeTitle = (value: string): string =>
  value.normalize('NFKC').trim().toLocaleLowerCase('ko-KR')

const requireSelectedTitles = (
  moments: HistoryGenerationOutput['moments'],
  requiredTitles: ReadonlyArray<string> | undefined,
): void => {
  if (requiredTitles === undefined) {
    return
  }

  const actualTitles = moments.map((moment) => normalizeTitle(moment.title)).sort()
  const expectedTitles = requiredTitles.map(normalizeTitle).sort()

  if (
    actualTitles.length !== expectedTitles.length ||
    actualTitles.some((title, index) => title !== expectedTitles[index])
  ) {
    throw new TypeError('Generated moments do not match the required titles')
  }
}

const normalizeUrl = (value: string): string => {
  const url = new URL(value)
  url.hostname = url.hostname.replace(/^www\./u, '')
  url.hash = ''
  url.search = ''

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/u, '')
  }

  return url.href
}

const getAllowedDomain = (
  hostname: string,
  allowedDomains: ReadonlyArray<string>,
): string | undefined =>
  allowedDomains.find((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

const getArticleIdentity = (value: string): string | undefined => {
  const url = new URL(normalizeUrl(value))
  const articleId = url.pathname.match(/-(?<articleId>\d{6,})$/u)?.groups?.articleId

  return articleId === undefined ? undefined : `${url.hostname}:${articleId}`
}

const createSourceResolver = (searchSourceUrls: ReadonlyArray<string>) => {
  const sourcesByUrl = new Map(searchSourceUrls.map((value) => [normalizeUrl(value), value]))
  const sourcesByArticleIdentity = new Map<string, Array<string>>()

  for (const value of searchSourceUrls) {
    const identity = getArticleIdentity(value)

    if (identity !== undefined) {
      const sources = sourcesByArticleIdentity.get(identity) ?? []
      sources.push(value)
      sourcesByArticleIdentity.set(identity, sources)
    }
  }

  return (value: string): string => {
    const normalizedUrl = normalizeUrl(value)
    const exactSource = sourcesByUrl.get(normalizedUrl)

    if (exactSource !== undefined) {
      return exactSource
    }

    const identity = getArticleIdentity(value)
    const articleSources =
      identity === undefined ? undefined : sourcesByArticleIdentity.get(identity)

    if (articleSources?.length === 1) {
      return articleSources[0]!
    }

    throw new TypeError(
      `A generated source was not returned by OpenAI web search: ${normalizedUrl}`,
    )
  }
}

const getMomentSourceUrls = (moment: HistoricalMomentDraft): ReadonlyArray<string> => [
  ...moment.sources.map((source) => source.url),
  ...moment.sections.event.sourceUrls,
  ...moment.sections.context.sourceUrls,
  ...moment.sections.significance.sourceUrls,
]

/** Parses AI output and verifies that every cited URL came from the required web search. */
export const validateHistoryOutput = (
  options: ValidateHistoryOutputOptions,
): HistoryGenerationOutput => {
  const parsedJson: unknown = JSON.parse(options.outputText)
  const output = historyGenerationOutputSchema.parse(parsedJson)
  requireSelectedTitles(output.moments, options.requiredTitles)
  const resolveSource = createSourceResolver(options.searchSourceUrls)
  const momentKeys = new Set<string>()

  for (const moment of output.moments) {
    if (moment.eventMonth !== options.targetMonth || moment.eventDay !== options.targetDay) {
      throw new TypeError('A generated moment does not match the target month and day')
    }

    const normalizedTitle = normalizeTitle(moment.title)
    const momentKey = `${moment.historicalEra}:${moment.eventYear}:${normalizedTitle}`

    if (momentKeys.has(momentKey)) {
      throw new TypeError('The generated output contains a duplicate moment')
    }

    momentKeys.add(momentKey)

    for (const source of moment.sources) {
      source.url = resolveSource(source.url)
    }

    for (const section of Object.values(moment.sections)) {
      section.sourceUrls = section.sourceUrls.map(resolveSource)
    }

    const momentSources = new Set(moment.sources.map((source) => normalizeUrl(source.url)))
    const publishers = new Set(
      moment.sources.map((source) => {
        const {hostname} = new URL(source.url)

        return getAllowedDomain(hostname, options.policy.allowedDomains) ?? hostname
      }),
    )

    if (publishers.size < 2) {
      throw new TypeError('A generated moment must cite at least two publishers')
    }

    for (const value of getMomentSourceUrls(moment)) {
      const normalizedUrl = normalizeUrl(value)
      const {hostname} = new URL(normalizedUrl)

      if (getAllowedDomain(hostname, options.policy.allowedDomains) === undefined) {
        throw new TypeError(`A generated source uses a disallowed domain: ${hostname}`)
      }

      if (!momentSources.has(normalizedUrl)) {
        throw new TypeError('A section cites a URL missing from the moment source list')
      }
    }

    for (const section of Object.values(moment.sections)) {
      const sectionPublishers = new Set(
        section.sourceUrls.map((value) => {
          const {hostname} = new URL(value)

          return getAllowedDomain(hostname, options.policy.allowedDomains) ?? hostname
        }),
      )

      if (sectionPublishers.size < 2) {
        throw new TypeError('Each generated section must cite at least two publishers')
      }
    }
  }

  return output
}
