import {createHistorySourceResolver, normalizeHistorySourceUrl} from './source-resolver'
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

/** Normalizes a history title for comparisons between generated and stored moments. */
export const normalizeHistoryTitle = (value: string): string =>
  value.normalize('NFKC').trim().toLocaleLowerCase('ko-KR')

const requireSelectedTitles = (
  moments: HistoryGenerationOutput['moments'],
  requiredTitles: ReadonlyArray<string> | undefined,
): void => {
  if (requiredTitles === undefined) {
    return
  }

  const hasRequiredTitleCount = moments.length === requiredTitles.length
  const matchesRequiredTitleSlots = moments.every((moment, index) => {
    const requiredTitle = requiredTitles[index]

    return (
      requiredTitle !== undefined &&
      normalizeHistoryTitle(moment.title) === normalizeHistoryTitle(requiredTitle)
    )
  })

  if (!hasRequiredTitleCount || !matchesRequiredTitleSlots) {
    throw new TypeError('Generated moments do not match the required titles')
  }
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

const requireAllowedDomain = (hostname: string, allowedDomains: ReadonlyArray<string>) => {
  const allowedDomain = getAllowedDomain(hostname, allowedDomains)

  if (allowedDomain === undefined) {
    throw new TypeError(`A generated source uses a disallowed domain: ${hostname}`)
  }

  return allowedDomain
}

/** Parses AI output and verifies that every cited URL came from the required web search. */
export const validateHistoryOutput = (
  options: ValidateHistoryOutputOptions,
): HistoryGenerationOutput => {
  const parsedJson: unknown = JSON.parse(options.outputText)
  const output = historyGenerationOutputSchema.parse(parsedJson)
  requireSelectedTitles(output.moments, options.requiredTitles)
  const resolveSource = createHistorySourceResolver(options.searchSourceUrls)
  const momentKeys = new Set<string>()

  for (const moment of output.moments) {
    if (moment.eventMonth !== options.targetMonth || moment.eventDay !== options.targetDay) {
      throw new TypeError('A generated moment does not match the target month and day')
    }

    const normalizedTitle = normalizeHistoryTitle(moment.title)
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

    const momentSources = new Set(
      moment.sources.map((source) => normalizeHistorySourceUrl(source.url)),
    )
    const publishers = new Set(
      moment.sources.map((source) => {
        const {hostname} = new URL(source.url)

        return requireAllowedDomain(hostname, options.policy.allowedDomains)
      }),
    )

    if (publishers.size < 2) {
      throw new TypeError('A generated moment must cite at least two publishers')
    }

    for (const value of getMomentSourceUrls(moment)) {
      const normalizedUrl = normalizeHistorySourceUrl(value)
      const {hostname} = new URL(normalizedUrl)

      requireAllowedDomain(hostname, options.policy.allowedDomains)

      if (!momentSources.has(normalizedUrl)) {
        throw new TypeError('A section cites a URL missing from the moment source list')
      }
    }

    for (const section of Object.values(moment.sections)) {
      const sectionPublishers = new Set(
        section.sourceUrls.map((value) => {
          const {hostname} = new URL(value)

          return requireAllowedDomain(hostname, options.policy.allowedDomains)
        }),
      )

      if (sectionPublishers.size < 2) {
        throw new TypeError('Each generated section must cite at least two publishers')
      }
    }
  }

  return output
}
