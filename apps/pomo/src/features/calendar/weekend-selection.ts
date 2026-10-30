import {createCalendarExclusionPattern} from './create-calendar-exclusion-pattern'
import type {CalendarWeekendIntent} from './period-range'

/** Keeps weekend selection local to its qualified or bare expression. */
export const createWeekendSelection = (
  wordStartPattern: string,
  periodBoundaryPattern: RegExp,
): ((text: string) => CalendarWeekendIntent | null) => {
  const nextPattern = /다음 ?주말/u
  const previousPattern = /(?:지난|저번) ?주말/u
  const afterNextPattern = new RegExp(
    `${wordStartPattern}다다음 ?주말${periodBoundaryPattern.source}`,
    'u',
  )
  const afterNextExclusion = createCalendarExclusionPattern(
    `${afterNextPattern.source}(?:은|에)?\\s*`,
  )
  const weekendExclusion = createCalendarExclusionPattern('주말(?:은|에)?\\s*')
  const weekendPattern = /주말/u
  const qualifiedTerm = '(?:다다음|다음|지난|저번) ?주말'
  const qualifiedExclusion = createCalendarExclusionPattern(`${qualifiedTerm}(?:은|에)?\\s*`)
  const excludedTarget = createCalendarExclusionPattern(
    `${wordStartPattern}(?:다다음|다음|지난|저번) ?주말(?:은|에)?\\s*`,
  )
  const excludedAfterNext = createCalendarExclusionPattern(
    `${wordStartPattern}다다음 ?주말(?:은|에)?\\s*`,
  )
  // A replacement cannot be positive when an existing period particle introduces exclusion.
  const nextReplacementExclusion = createCalendarExclusionPattern(
    '(?<!다)다음 ?주말' +
      '(?:에는|에서|부터|까지|이랑|하고|은|는|이|가|을|를|에|엔|도|로|만|중|쯤|의|과|와|랑)?\\s*',
  )
  const qualifiedExpression = new RegExp(`${qualifiedExclusion.source}|${qualifiedTerm}`, 'gu')

  const thisWeekendExclusion = createCalendarExclusionPattern(
    `${wordStartPattern}이번 ?주말(?:은|에)?\\s*`,
  )
  const replacementExclusion = createCalendarExclusionPattern('')

  const hasNextWeekendAfterThisExclusion = (text: string): boolean => {
    if (!thisWeekendExclusion.test(text)) {
      return false
    }

    const remaining = text.replace(thisWeekendExclusion, '')
    if (replacementExclusion.test(remaining)) {
      return false
    }

    const expressions = [...remaining.matchAll(qualifiedExpression)]
    return (
      expressions.length === 1 &&
      /^다음 ?주말$/u.test(expressions[0]?.[0] ?? '') &&
      !weekendPattern.test(remaining.replace(qualifiedExpression, ''))
    )
  }

  const hasRemainingNextWeekend = (text: string): boolean => {
    if (!excludedAfterNext.test(text) || nextReplacementExclusion.test(text)) {
      return false
    }

    const expressions = [...text.matchAll(qualifiedExpression)].map(([expression]) => expression)
    const positiveExpressions = expressions.filter(
      (expression) => !qualifiedExclusion.test(expression),
    )
    return (
      expressions.length === 2 &&
      positiveExpressions.length === 1 &&
      /^다음 ?주말$/u.test(positiveExpressions[0] ?? '') &&
      !weekendPattern.test(text.replace(qualifiedExpression, ''))
    )
  }

  const hasUnexcludedBareWeekend = (text: string): boolean => {
    if (!excludedTarget.test(text)) {
      return false
    }

    const expressions = [...text.matchAll(qualifiedExpression)]
    if (expressions.some(([expression]) => !qualifiedExclusion.test(expression))) {
      return false
    }

    const bareText = text.replace(qualifiedExpression, '')
    return weekendPattern.test(bareText) && !weekendExclusion.test(bareText)
  }

  return (text) => {
    if (afterNextPattern.test(text) && !afterNextExclusion.test(text)) {
      return 'after-next'
    }

    if (!weekendPattern.test(text)) {
      return null
    }

    if (weekendExclusion.test(text)) {
      return hasUnexcludedBareWeekend(text)
        ? 'upcoming'
        : hasRemainingNextWeekend(text) || hasNextWeekendAfterThisExclusion(text)
          ? 'next'
          : null
    }

    if (previousPattern.test(text)) {
      return 'previous'
    }

    return nextPattern.test(text) ? 'next' : 'upcoming'
  }
}
