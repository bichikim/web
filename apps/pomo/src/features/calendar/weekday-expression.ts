interface CreateCalendarWeekdayParserOptions {
  readonly calendarIntentPattern: RegExp
  readonly calendarPeriodBoundaryPattern: RegExp
  readonly calendarWordStartPattern: string
}

interface WeekdayMatch {
  readonly end: number
  readonly start: number
  readonly weekday: string | undefined
}

interface WeekdayDateExpression {
  readonly contextEnd: number
  readonly matches: ReadonlyArray<WeekdayMatch>
}

export interface WeekdayIntent {
  readonly hasExcludedWeekday: boolean
  readonly offsets: ReadonlyArray<number>
}

export const createCalendarWeekdayParser = ({
  calendarIntentPattern,
  calendarPeriodBoundaryPattern,
  calendarWordStartPattern,
}: CreateCalendarWeekdayParserOptions) => {
  const weekdayNamePatternSource = '[월화수목금토일]'
  const weekdayPatternSource = `${weekdayNamePatternSource}(?:요일)?`
  const weekdayPattern = new RegExp(
    `${calendarWordStartPattern}` +
      `(?<weekday>${weekdayNamePatternSource})(?:요일)?${calendarPeriodBoundaryPattern.source}`,
    'gu',
  )
  const weekdayExclusionPattern = /(?:말고|빼고|제외(?:하고)?|아니|아닌|안\s*(?:되|돼))/u
  const weekdayExclusionContextPattern = new RegExp(
    `^\\s*(?:(?:에는|에|은|는|이|가)\\s*)?(?:일정(?:은|는)?\\s*)?${weekdayExclusionPattern.source}`,
    'u',
  )
  const weekdayDateExpressionBoundaryPattern = new RegExp(
    `(?:${calendarIntentPattern.source}|뭐|무엇)`,
    'u',
  )
  const weekdayExclusionAfterIntentPattern = new RegExp(
    `^\\s*(?:은|는)?\\s*${weekdayExclusionPattern.source}`,
    'u',
  )
  const weekdayDatePrefixPattern = /^(?:\s|[,，、]|(?:에|은|는|중|쯤|도))*$/u
  const weekdayDateSeparatorPattern =
    /^(?:\s|[,，、]|(?:및|또는|랑|하고|부터|에서|까지|과|와|에|은|는|이|가|을|를|엔|도|로|만|쯤|중))*$/u
  const weekdayNamesFromMonday = ['월', '화', '수', '목', '금', '토', '일'] as const
  const weekdayOffsetFromMonday: ReadonlyMap<string, number> = new Map(
    weekdayNamesFromMonday.map((dayName, offset) => [dayName, offset] as const),
  )

  const getConnectedWeekdayMatches = (
    text: string,
    start: number,
    end: number,
  ): ReadonlyArray<WeekdayMatch> => {
    const expressionText = text.slice(start, end)
    const weekdayMatches = Array.from(expressionText.matchAll(weekdayPattern), (match) => ({
      end: start + (match.index ?? 0) + match[0].length,
      start: start + (match.index ?? 0),
      weekday: match.groups?.weekday,
    }))
    const [firstMatch] = weekdayMatches
    if (
      firstMatch === undefined ||
      !weekdayDatePrefixPattern.test(expressionText.slice(0, firstMatch.start - start))
    ) {
      return []
    }

    const connectedMatches: WeekdayMatch[] = [firstMatch]
    let previousMatch = firstMatch
    for (const match of weekdayMatches.slice(1)) {
      const separator = text.slice(previousMatch.end, match.start)
      if (
        !weekdayDateSeparatorPattern.test(separator) &&
        !weekdayExclusionContextPattern.test(separator) &&
        !/요일/u.test(text.slice(match.start, match.end))
      ) {
        break
      }

      connectedMatches.push(match)
      previousMatch = match
    }

    return connectedMatches
  }

  const getWeekdayDateExpression = (text: string): WeekdayDateExpression => {
    const boundaryMatch = weekdayDateExpressionBoundaryPattern.exec(text)
    const boundaryIndex = boundaryMatch?.index ?? text.length
    const dateMatches = getConnectedWeekdayMatches(text, 0, boundaryIndex)
    if (boundaryMatch === null) {
      return {contextEnd: text.length, matches: dateMatches}
    }

    const boundaryEnd = boundaryIndex + boundaryMatch[0].length
    if (!calendarIntentPattern.test(boundaryMatch[0])) {
      return {contextEnd: boundaryIndex, matches: dateMatches}
    }

    const exclusionMatch = weekdayExclusionAfterIntentPattern.exec(text.slice(boundaryEnd))
    if (exclusionMatch === null) {
      return {contextEnd: boundaryIndex, matches: dateMatches}
    }

    const continuationStart = boundaryEnd + exclusionMatch[0].length
    const continuationMatches = getConnectedWeekdayMatches(text, continuationStart, text.length)
    const lastContinuationMatch = continuationMatches.at(-1)
    const trailingExclusion =
      lastContinuationMatch === undefined
        ? undefined
        : weekdayExclusionContextPattern.exec(text.slice(lastContinuationMatch.end))?.[0]
    return {
      contextEnd:
        lastContinuationMatch === undefined
          ? continuationStart
          : lastContinuationMatch.end + (trailingExclusion?.length ?? 0),
      matches: [...dateMatches, ...continuationMatches],
    }
  }

  const getWeekdayIntent = (text: string): WeekdayIntent => {
    const weekdayDateExpression = getWeekdayDateExpression(text)
    const weekdayOffsets = new Set<number>()
    let hasExcludedWeekday = false

    for (const [index, match] of weekdayDateExpression.matches.entries()) {
      const offset = weekdayOffsetFromMonday.get(match.weekday ?? '')
      const nextWeekdayMatch = weekdayDateExpression.matches[index + 1]
      const weekdayContext = text.slice(
        match.end,
        nextWeekdayMatch?.start ?? weekdayDateExpression.contextEnd,
      )
      const isExcludedWeekday = weekdayExclusionContextPattern.test(weekdayContext)
      hasExcludedWeekday ||= isExcludedWeekday
      if (offset !== undefined && !isExcludedWeekday) {
        weekdayOffsets.add(offset)
      }
    }
    return {hasExcludedWeekday, offsets: Array.from(weekdayOffsets)}
  }

  return {getWeekdayIntent, weekdayExclusionPattern, weekdayPatternSource}
}
