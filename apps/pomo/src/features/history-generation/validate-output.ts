import {
  type HistoricalMomentDraft,
  type HistoryGenerationOutput,
  historyGenerationOutputSchema,
  type HistorySourcePolicy,
} from './contract'

interface ValidateHistoryOutputOptions {
  readonly outputText: string
  readonly policy: HistorySourcePolicy
  readonly searchSourceUrls: ReadonlyArray<string>
  readonly targetDay: number
  readonly targetMonth: number
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
  const searchSources = new Set(options.searchSourceUrls.map(normalizeUrl))
  const momentKeys = new Set<string>()

  for (const moment of output.moments) {
    if (moment.eventMonth !== options.targetMonth || moment.eventDay !== options.targetDay) {
      throw new TypeError('A generated moment does not match the target month and day')
    }

    const normalizedTitle = moment.title.normalize('NFKC').toLocaleLowerCase('ko-KR')
    const momentKey = `${moment.historicalEra}:${moment.eventYear}:${normalizedTitle}`

    if (momentKeys.has(momentKey)) {
      throw new TypeError('The generated output contains a duplicate moment')
    }

    momentKeys.add(momentKey)
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

      if (!searchSources.has(normalizedUrl)) {
        throw new TypeError(
          `A generated source was not returned by OpenAI web search: ${normalizedUrl}`,
        )
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
